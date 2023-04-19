import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { UpdateUser, User, UserAndAuthenticationApiClient } from '../shared-data-access-api';
import { AuthService } from '../shared-data-access-auth/auth.service';
import { ApiStatus } from '../shared-data-access-models/api-status';
import { injectIsServer } from '../shared-utils/is-server';

@Injectable()
export class SettingsService {
    readonly #userAndAuthenticationApiClient = inject(UserAndAuthenticationApiClient);
    readonly #authService = inject(AuthService);
    readonly #isServer = injectIsServer();

    // events
    readonly userUpdateClicked = createEvent<UpdateUser>();

    // stores
    readonly #status = createStore<ApiStatus>('idle');
    readonly isLoading = this.#status.map((status) => status === 'loading');
    readonly user = this.#authService.user;
    readonly updateUser = createStore<UpdateUser>({});

    // effects
    readonly #userUpdateFx = createEffect<UpdateUser, { user: User }>();

    constructor() {
        sample({
            source: this.userUpdateClicked,
            target: this.#userUpdateFx
        })

        sample({
            source: this.#userUpdateFx,
            fn: () => 'loading' as const,
            target: this.#status
        })

        sample({
            source: this.#userUpdateFx.doneData,
            fn: () => 'success' as const,
            target: this.#status
        });

        sample({
            source: this.#userUpdateFx.failData,
            fn: () => 'error' as const,
            target: this.#status
        });

        sample({
            source: this.#userUpdateFx.doneData,
            fn: (response) => ['/profile', response.user.username],
            target: this.#authService.autheticationRequired
        });

        sample({
            source: this.user,
            filter: user => user !== null,
            fn: user => ({...structuredClone(user), password: ''}),
            target: this.updateUser
        })
        this.#userUpdateFx.use(user => this.#userAndAuthenticationApiClient.updateCurrentUser({ body: { user } }));
    }

    logout() {
        if (!this.#isServer) {
            localStorage.removeItem('ng-conduit-signals-token');
            localStorage.removeItem('ng-conduit-signals-user');
        }
        this.#authService.autheticationRequired();
    }
}
