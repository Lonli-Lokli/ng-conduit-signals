import { Injectable, inject } from '@angular/core';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { Article, ArticlesApiClient } from '../shared-data-access-api';
import { FavoriteArticleService } from '../shared-data-access-favorite-article/favorite-article.service';
import { ApiStatus } from '../shared-data-access-models/api-status';
import { FeedType } from '../shared-data-access-models/feed-type';

@Injectable()
export class HomeService {
    readonly #articlesApiClient = inject(ArticlesApiClient);
    readonly #favoriteArticleService = inject(FavoriteArticleService);

    // events
    readonly articleSelected = createEvent<{ type: FeedType; tag?: string }>();
    readonly favoriteToggled = createEvent<Article>();

    // stores
    readonly status = createStore<ApiStatus>('idle');
    readonly feedType = createStore<FeedType>('global');
    readonly selectedTag = createStore('');
    readonly articles = createStore<Article[]>([]);
    readonly toggleFavoriteStatus = this.#favoriteArticleService.status;

    // effects
    readonly #articleGetFx = createEffect<
        { type: FeedType; tag?: string },
        {
            articles: Article[];
            articlesCount: number;
        }
    >();

    readonly #favoriteToggleFx = createEffect<Article, Article | null>();

    constructor() {
        sample({
            source: this.articleSelected,
            fn: () => 'loading' as const,
            target: this.status,
        });

        sample({
            source: this.articleSelected,
            fn: ({ type }) => type,
            target: this.feedType,
        });

        sample({
            source: this.articleSelected,
            fn: ({ tag }) => tag || '',
            target: this.selectedTag,
        });

        sample({
            source: this.articleSelected,
            target: this.#articleGetFx,
        });

        sample({
            source: this.#articleGetFx.doneData,
            fn: (response) => response.articles,
            target: this.articles,
        });

        sample({
            source: this.#articleGetFx.doneData,
            fn: () => 'success' as const,
            target: this.status,
        });

        sample({
            source: this.#articleGetFx.fail,
            fn: () => 'error' as const,
            target: this.status,
        });

        sample({
            source: this.#articleGetFx.fail,
            target: this.articles.reinit!,
        });

        sample({
            clock: this.#favoriteToggleFx.doneData,
            source: this.articles,
            filter: (_, data: Article | null): data is Article => data !== null,
            fn: (articles, updatedArticle) =>
                articles.map((article) => {
                    if (article.slug === updatedArticle!.slug) return updatedArticle!;
                    return article;
                }),
            target: this.articles,
        });

        this.#articleGetFx.use(({ type, tag }) => {
            if (type === 'feed') return this.#articlesApiClient.getArticlesFeed();
            if (type === 'tag' && tag) {
                return this.#articlesApiClient.getArticles({ tag });
            }
            return this.#articlesApiClient.getArticles();
        });
        this.#favoriteToggleFx.use((articleToToggle) => this.#favoriteArticleService.toggleFavorite(articleToToggle));
    }
}
