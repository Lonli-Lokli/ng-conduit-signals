import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { filter, from, map } from 'rxjs';
import { AuthService } from './auth.service';

export function authGuard(type: 'protected' | 'unprotected'): CanMatchFn {
    return () => {
        const router = inject(Router);
        const authService = inject(AuthService);

        return from(authService.isAuthenticated).pipe(
            filter(() => !authService.isAuthenticating.getState()), // TODO: bad practise
            map((isAuthenticated) => {
                if ((type === 'unprotected' && !isAuthenticated) || (type === 'protected' && isAuthenticated))
                    return true;
                return router.parseUrl('/');
            })
        );
    };
}
