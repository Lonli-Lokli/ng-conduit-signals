import { inject, Injectable } from '@angular/core';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { Profile, ProfileApiClient } from '../shared-data-access-api';
import { AuthService } from '../shared-data-access-auth/auth.service';
import { FollowAuthorService } from '../shared-data-access-follow-author/follow-author.service';
import { ApiStatus } from '../shared-data-access-models/api-status';

@Injectable()
export class ProfileService {
    readonly #profileApiClient = inject(ProfileApiClient);
    readonly #authService = inject(AuthService);
    readonly #followAuthorService = inject(FollowAuthorService);

    // events
    public profileRequested = createEvent<string>();
    public profileToggleClicked = createEvent<Profile>();

    // stores
    readonly #status = createStore<ApiStatus>('idle');
    readonly profile = createStore<Profile | null>(null);
    readonly isLoading = this.#status.map((status) => status === 'loading');
    readonly isOwner = combine(
        { currentUser: this.#authService.user, profile: this.profile },
        ({ currentUser, profile }) => !!currentUser && !!profile && profile.username === currentUser.username
    );

    // effects
    readonly #profileGetFx = createEffect<string, { profile: Profile }>();
    readonly #profileTogggleFx = createEffect<Profile, Profile | null>();

    constructor() {
        sample({
            source: this.profileRequested,
            target: this.#profileGetFx,
        });

        sample({
            source: this.#profileGetFx,
            fn: () => 'loading' as const,
            target: this.#status,
        });

        sample({
            source: this.#profileGetFx.doneData,
            fn: () => 'success' as const,
            target: this.#status,
        });

        sample({
            source: this.#profileGetFx.failData,
            fn: () => 'error' as const,
            target: this.#status,
        });

        sample({
            source: this.#profileGetFx.failData,
            target: this.profile.reinit!,
        });

        sample({
            source: this.#profileGetFx.doneData,
            fn: (response) => response.profile,
            target: this.profile,
        });

        sample({
            source: this.#profileTogggleFx.doneData,
            fn: response => response,
            target: this.profile
        })

        sample({
            source: this.profileToggleClicked,
            target: this.#profileTogggleFx
        })
        this.#profileGetFx.use(username => this.#profileApiClient.getProfileByUsername({ username }));
        this.#profileTogggleFx.use(profile =>  this.#followAuthorService.toggleFollow(profile));
    }
}
