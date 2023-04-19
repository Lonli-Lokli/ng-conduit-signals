import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { LoginUser, UserAndAuthenticationApiClient } from '../shared-data-access-api';
import { AuthService } from '../shared-data-access-auth/auth.service';
import { FormErrorsService } from '../shared-data-access-form-errors/form-errors.service';
import { ApiStatus } from '../shared-data-access-models/api-status';

@Injectable()
export class LoginService {
    readonly #userAndAuthenticationApiClient = inject(UserAndAuthenticationApiClient);
    readonly #authService = inject(AuthService);
    readonly #formErrorsService = inject(FormErrorsService);

    // events
    readonly loginRequested = createEvent<LoginUser>();

    // stores
    readonly #status = createStore<ApiStatus>('idle');
    readonly isLoading = this.#status.map((status) => status === 'loading');
    readonly errors = this.#formErrorsService.formErrors;

    // effects
    readonly #userLoginFx = createEffect<LoginUser, void, HttpErrorResponse>();

    constructor() {
        sample({
            source: this.loginRequested,
            fn: () => 'loading' as const,
            target: this.#status,
        });

        sample({
            source: this.loginRequested,
            target: this.#userLoginFx,
        });

        sample({
            source: this.#userLoginFx.doneData,
            fn: () => void 0,
            target: this.#authService.autheticationRequired,
        });

        sample({
            source: this.#userLoginFx.doneData,
            fn: () => 'success' as const,
            target: this.#status,
        });
        sample({
            source: this.#userLoginFx.doneData,
            target: this.#authService.autheticationRequired,
        });

        sample({
            source: this.#userLoginFx.failData,
            fn: () => 'error' as const,
            target: this.#status,
        });

        sample({
            source: this.#userLoginFx.failData,
            filter: (response) => response.error.errors !== null,
            fn: (response) => response.error.errors,
            target: this.#formErrorsService.errorsReceived,
        });

        this.#userLoginFx.use((data) =>
            this.#userAndAuthenticationApiClient.login({ body: { user: data } }).then((response) => {
                localStorage.setItem('ng-conduit-signals-token', response.user.token);
                localStorage.setItem('ng-conduit-signals-user', JSON.stringify(response.user));
            })
        );
    }
}
