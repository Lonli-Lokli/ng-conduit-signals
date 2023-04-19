import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { NewUser, UserAndAuthenticationApiClient } from '../shared-data-access-api';
import { AuthService } from '../shared-data-access-auth/auth.service';
import { FormErrorsService } from '../shared-data-access-form-errors/form-errors.service';
import { ApiStatus } from '../shared-data-access-models/api-status';

@Injectable()
export class RegisterService {
    readonly #userAndAuthenticationApiClient = inject(UserAndAuthenticationApiClient);
    readonly #authService = inject(AuthService);
    readonly #formErrorsService = inject(FormErrorsService);

    // events
    readonly registerUserClicked = createEvent<NewUser>();

    // stores
    readonly #status = createStore<ApiStatus>('idle');
    readonly errors = this.#formErrorsService.formErrors;
    readonly isLoading = this.#status.map((status) => status === 'loading');

    // effects
    readonly #createUserFx = createEffect<NewUser, void, HttpErrorResponse>();
    constructor() {
        sample({
            source: this.registerUserClicked,
            fn: () => 'loading' as const,
            targeet: this.#status,
        });

        sample({
            source: this.registerUserClicked,
            target: this.#createUserFx,
        });

        sample({
            source: this.#createUserFx.doneData,
            fn: () => 'success' as const,
            targeet: this.#status,
        });

        sample({
            source: this.#createUserFx.doneData,
            targeet: this.#authService.autheticationRequired,
        });

        sample({
            source: this.#createUserFx.failData,
            fn: () => 'error' as const,
            targeet: this.#status,
        });

        sample({
            source: this.#createUserFx.failData,
            filter: (response) => response.error.errors !== null,
            fn: (response) => response.error.errors,
            target: this.#formErrorsService.errorsReceived,
        });

        this.#createUserFx
            .use((data) => this.#userAndAuthenticationApiClient.createUser({ body: { user: data } })
            .then((response) => {
                localStorage.setItem('ng-conduit-signals-token', response.user.token);
                localStorage.setItem('ng-conduit-signals-user', JSON.stringify(response.user));
            }));
    }
}
