import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FavoriteArticleService } from '../shared-data-access-favorite-article/favorite-article.service';
import { SharedUiArticlesList } from '../shared-ui/articles-list/articles-list.component';
import { ProfileArticlesService } from './profile-articles.service';
import { AsyncPipe } from '@angular/common';

@Component({
    template: `
        <app-shared-ui-articles-list
            [status]="(profileArticlesService.status | async)!"
            [articles]="(profileArticlesService.articles | async)!"
            (toggleFavorite)="profileArticlesService.toggleFavoriteClicked($event)"
        />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    providers: [ProfileArticlesService, FavoriteArticleService],
    imports: [SharedUiArticlesList, AsyncPipe],
})
export default class ProfileArticles implements OnInit {
    protected readonly profileArticlesService = inject(ProfileArticlesService);

    ngOnInit() {
        this.profileArticlesService.getArticlesRequested;
    }
}
