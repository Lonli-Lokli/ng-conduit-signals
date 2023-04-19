import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { Article, ArticlesApiClient, UpdateArticle } from '../../shared-data-access-api';
import { ApiStatus } from '../../shared-data-access-models/api-status';

@Injectable()
export class EditArticleService {
    readonly #articlesApiClient = inject(ArticlesApiClient);
    readonly #router = inject(Router);

    // events
    readonly articleSelected = createEvent<string>();
    readonly articleUpdateClicked = createEvent<UpdateArticle>();

    // stores
    readonly #status = createStore<ApiStatus>('idle');
    readonly article = createStore<Article | null>(null);
    readonly isLoading = this.#status.map((status) => status === 'loading');

    // effects
    readonly #articleGetFx = createEffect<string, { article: Article }>();
    readonly #articleUpdateFx = createEffect<{ article: Article; articleToUpdate: UpdateArticle }, void>();

    constructor() {
        sample({
            source: this.articleSelected,
            target: this.#articleGetFx,
        });

        sample({
            clock: this.#articleGetFx.doneData,
            fn: (response) => response.article,
            target: this.article,
        });

        sample({
            clock: this.#articleGetFx.done,
            fn: () => 'success' as const,
            target: this.#status,
        });

        sample({
            clock: this.#articleGetFx.fail,
            fn: () => 'error' as const,
            target: this.#status,
        });

        sample({
            clock: this.articleUpdateClicked,
            source: this.article,
            filter: (article: Article | null): article is Article => article !== null,
            fn: (article, articleToUpdate) => ({ article, articleToUpdate }),
            target: this.#articleUpdateFx,
        });

        this.#articleGetFx.use((slug) => this.#articlesApiClient.getArticle({ slug }));
        this.#articleUpdateFx.use(async ({ article, articleToUpdate }) => {
            const response = await this.#articlesApiClient.updateArticle({
                slug: article.slug,
                body: { article: articleToUpdate },
            });
            void this.#router.navigate(['/article', response.article.slug]);
        });
    }
}
