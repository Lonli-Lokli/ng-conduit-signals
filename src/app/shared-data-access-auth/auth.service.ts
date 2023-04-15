import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { lastValueFrom } from 'rxjs';
import { User, UserAndAuthenticationApiClient } from '../shared-data-access-api';
import { injectIsServer } from '../shared-utils/is-server';

export type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
    readonly #userAndAuthenticationApiClient = inject(UserAndAuthenticationApiClient);
    readonly #router = inject(Router);
    readonly #isServer = injectIsServer();

    // events
    readonly #tokenRefreshRequested = createEvent();
    readonly autheticationRequired = createEvent<string[] | void>();

    // stores
    readonly user = createStore<User | null>(null);
    readonly #status = createStore<AuthStatus>('idle');
    readonly isAuthenticated = this.#status.map((status) => status === 'authenticated');
    readonly isAuthenticating = this.#status.map((status) => status === 'idle');
    readonly username = this.user.map((user) => user?.username || '');

    // effects
    readonly #refreshTokenFx = createEffect<void, User | null>();

    constructor() {
        sample({
            clock: this.#tokenRefreshRequested,
            target: this.#refreshTokenFx,
        });

        sample({
            clock: [
                this.#refreshTokenFx.doneData.map((user) => user === null),
                this.#refreshTokenFx.fail.map(() => true),
            ],
            filter: (erase) => erase,
            fn: () => 'unauthenticated' as const,
            target: [this.#status, this.user.reinit!]
        });

        sample({
            source: this.#refreshTokenFx.doneData,
            filter: (user) => user !== null,
            fn: () => 'authenticated' as const,
            target: this.#status,
        });

        sample({
            source: this.#refreshTokenFx.doneData,
            filter: (user) => user !== null,
            target: this.user,
        });

        this.#refreshTokenFx.use(async () => {
            const token = localStorage.getItem('ng-conduit-signals-token');
            if (!token) return null;

            const { user } = await lastValueFrom(this.#userAndAuthenticationApiClient.getCurrentUser());

            localStorage.setItem('ng-conduit-signals-user', JSON.stringify(user));
            return user;
        });
    }
    
    refresh() {
        if (this.#isServer) return;
        this.#tokenRefreshRequested();
    }

    // authenticate(urlSegments: string[] = ['/']) {
    //     this.refresh().then(() => this.#router.navigate(urlSegments)); // TODO: not sure yet how to do
    // }
}
