import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { createEffect, createEvent, sample } from 'effector';
import { AuthService } from 'src/app/shared-data-access-auth/auth.service';
import { ArticlesApiClient, NewArticle, User } from '../../shared-data-access-api';

@Injectable()
export class NewArticleService {
    readonly #articlesClient = inject(ArticlesApiClient);
    readonly #router = inject(Router);
    readonly #authService = inject(AuthService);

    // events
    readonly createArticleClicked = createEvent<NewArticle>();

    // effects
    readonly #createArticleFx = createEffect<{ newArticle: NewArticle; user: User }, void>();

    constructor() {
        sample({
            clock: this.createArticleClicked,
            source: this.#authService.user,
            filter: (user: User | null): user is User => user !== null,
            fn: (user, newArticle) => ({ user, newArticle }),
            target: this.#createArticleFx,
        });
        this.#createArticleFx.use(async ({ newArticle, user }) => {
            const response = await this.#articlesClient.createArticle({ body: { article: newArticle } });
            if (response) {
                this.#router.navigate(['/article', response.article.slug]);
            } else {
                this.#router.navigate(['/profile', user.username]);
            }
        });
    }
}
