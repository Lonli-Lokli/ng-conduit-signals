import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input as RouteInput, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FollowAuthorService } from '../shared-data-access-follow-author/follow-author.service';
import { UiProfileArticlesToggle } from '../ui-profile/articles-toggle/articles-toggle.component';
import { UiProfileUserInfo } from '../ui-profile/user-info/user-info.component';
import { ProfileService } from './profile.service';
import { Title } from '@angular/platform-browser';

@Component({
    template: `
        <ng-container *ngIf="!(profileService.isLoading | async); else loading">
            <ng-container *ngIf="this.profileService.profile | async as profile">
                <app-ui-profile-user-info
                    [profile]="profile"
                    [isOwner]="(profileService.isOwner | async)!"
                    (toggleFollow)="profileService.profileToggleClicked(profile)"
                />
                <div class="container">
                    <div class="row">
                        <div class="col-xs-12 col-md-10 offset-md-1">
                            <app-ui-profile-articles-toggle [username]="profile.username" />
                            <router-outlet />
                        </div>
                    </div>
                </div>
            </ng-container>
        </ng-container>
        <ng-template #loading>
            <p>Loading profile...</p>
        </ng-template>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    host: { class: 'block profile-page' },
    providers: [ProfileService, FollowAuthorService],
    imports: [NgIf, RouterOutlet, UiProfileUserInfo, UiProfileArticlesToggle, AsyncPipe],
})
export default class Profile {
    protected readonly profileService = inject(ProfileService);
    protected readonly titleService = inject(Title);
    
    @RouteInput() set username(username: string) {
        this.profileService.profileRequested(username);
        this.titleService.setTitle(username + ' Author Profile');
    }
}
