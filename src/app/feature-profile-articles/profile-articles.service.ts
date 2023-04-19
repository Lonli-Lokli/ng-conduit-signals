import { inject, Injectable } from '@angular/core';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { ProfileService } from '../feature-profile/profile.service';
import { Article, ArticlesApiClient, Profile } from '../shared-data-access-api';
import { FavoriteArticleService } from '../shared-data-access-favorite-article/favorite-article.service';
import { ApiStatus } from '../shared-data-access-models/api-status';
import { PROFILE_ARTICLES_TYPE } from './profile-articles.di';

@Injectable()
export class ProfileArticlesService {
    readonly #articlesApiClient = inject(ArticlesApiClient);
    readonly #favoriteArticleService = inject(FavoriteArticleService);
    readonly #articlesType = inject(PROFILE_ARTICLES_TYPE);
    readonly #profileService = inject(ProfileService);

    // events
    readonly getArticlesRequested = createEvent();
    readonly toggleFavoriteClicked = createEvent<Article>();

    // stores
    readonly status = createStore<ApiStatus>('idle');
    readonly articles = createStore<Article[]>([]);

    // effects
    readonly #articlesGetFx = createEffect<Profile, { articles: Article[]; articlesCount: number }>();
    readonly #toggleFavoriteFx = createEffect<Article, Article | null>();

    constructor() {
        sample({
            clock: this.getArticlesRequested,
            source: this.#profileService.profile,
            filter: (profile: Profile | null): profile is Profile => profile !== null,
            target: this.#articlesGetFx,
        });

        sample({
            source: this.#articlesGetFx,
            fn: () => 'loading' as const,
            target: this.status,
        });

        sample({
            source: this.#articlesGetFx.doneData,
            fn: () => 'success' as const,
            target: this.status,
        });

        sample({
            source: this.#articlesGetFx.doneData,
            fn: (response) => response.articles,
            target: this.articles,
        });

        sample({
            source: this.#articlesGetFx.failData,
            fn: () => 'error' as const,
            target: this.status,
        });

        sample({
            source: this.#articlesGetFx.failData,
            target: this.articles.reinit!,
        });

        sample({
            clock: this.#toggleFavoriteFx.done,
            source: this.articles,
            filter: (_, article) => article !== null,
            fn: (articles, { params, result }) =>
                articles.map((article) => {
                    if (article.slug === params.slug) return result!;
                    return article;
                }),
            target: this.articles,
        });
        this.#articlesGetFx.use((profile) =>
            this.#articlesType === 'favorites'
                ? this.#articlesApiClient.getArticles({ favorited: profile.username })
                : this.#articlesApiClient.getArticles({ author: profile.username })
        );
        this.#toggleFavoriteFx.use((articleToToggle) => this.#favoriteArticleService.toggleFavorite(articleToToggle));
    }
}
