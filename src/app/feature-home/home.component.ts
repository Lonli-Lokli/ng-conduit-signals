import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../shared-data-access-auth/auth.service';
import { FavoriteArticleService } from '../shared-data-access-favorite-article/favorite-article.service';
import { SharedUiArticlesList } from '../shared-ui/articles-list/articles-list.component';
import { UiHomeBanner } from '../ui-home/banner/banner.component';
import { UiHomeFeedToggle } from '../ui-home/feed-toggle/feed-toggle.component';
import { UiHomeTags } from '../ui-home/tags/tags.component';
import { HomeService } from './home.service';
import { TagsService } from './tags.service';
import { AsyncPipe } from '@angular/common';

@Component({
    standalone: true,
    template: `
        <app-ui-home-banner />

        <div class="container page">
            <div class="row">
                <div class="col-md-9">
                    <app-ui-home-feed-toggle
                        [selectedTag]="(homeService.selectedTag | async)!"
                        [isFeedDisabled]="!(authService.isAuthenticated | async)"
                        [feedType]="(homeService.feedType | async)!"
                        (selectFeed)="homeService.articleSelected({type: 'feed'})"
                        (selectGlobal)="homeService.articleSelected({type: 'global'})"
                    />
                    <app-shared-ui-articles-list
                        [status]="(homeService.status | async)!"
                        [articles]="(homeService.articles | async)!"
                        (toggleFavorite)="homeService.favoriteToggled($event)"
                    />
                </div>

                <div class="col-md-3">
                    <app-ui-home-tags
                        [status]="(tagsService.status | async)!"
                        [tags]="(tagsService.tags | async)!"
                        (selectTag)="homeService.articleSelected({type: 'tag', tag: $event})"
                    >
                        <p>Loading...</p>
                    </app-ui-home-tags>
                </div>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [FavoriteArticleService, HomeService, TagsService],
    host: { class: 'block home-page' },
    imports: [UiHomeBanner, UiHomeTags, UiHomeFeedToggle, SharedUiArticlesList, AsyncPipe],
})
export default class Home implements OnInit {
    protected readonly homeService = inject(HomeService);
    protected readonly tagsService = inject(TagsService);
    protected readonly authService = inject(AuthService);

    ngOnInit() {
        this.tagsService.getTagsRequested();
        this.homeService.articleSelected({type: 'global'});
    }
}
