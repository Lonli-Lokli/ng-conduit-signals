import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../shared-data-access-auth/auth.service';
import { UiLayoutFooter } from '../ui-layout/footer/footer.component';
import { UiLayoutHeader } from '../ui-layout/header/header.component';
import { AsyncPipe } from '@angular/common';

@Component({
    standalone: true,
    template: `
        <app-ui-layout-header [username]="(authService.username | async)!" [isAuthenticated]="(authService.isAuthenticated | async)!" />
        <router-outlet />
        <app-ui-layout-footer />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [UiLayoutHeader, UiLayoutFooter, RouterOutlet, AsyncPipe],
})
export default class Layout {
    protected readonly authService = inject(AuthService);
}
