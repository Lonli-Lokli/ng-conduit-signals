import { Injectable, SecurityContext, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { marked } from 'marked';
import { Article, ArticlesApiClient, Comment, CommentsApiClient, Profile } from '../shared-data-access-api';
import { AuthService } from '../shared-data-access-auth/auth.service';
import { FavoriteArticleService } from '../shared-data-access-favorite-article/favorite-article.service';
import { FollowAuthorService } from '../shared-data-access-follow-author/follow-author.service';
import { ApiStatus } from '../shared-data-access-models/api-status';

@Injectable()
export class ArticleService {
    readonly #router = inject(Router);
    readonly #domSanitizer = inject(DomSanitizer);
    readonly #articlesApiClient = inject(ArticlesApiClient);
    readonly #commentsApiClient = inject(CommentsApiClient);
    readonly #favoriteArticleService = inject(FavoriteArticleService);
    readonly #followAuthorService = inject(FollowAuthorService);
    readonly #authService = inject(AuthService);

    // events
    readonly newArticleSelected = createEvent<string>();
    readonly favoriteToggled = createEvent<Article>();
    readonly articleDeleted = createEvent<string>();
    readonly followAuthorToggled = createEvent<Profile>();
    readonly commentCreated = createEvent<string>();
    readonly deleteCommentClicked = createEvent<number>();

    // stores
    readonly status = createStore<ApiStatus>('idle');
    readonly article = createStore<Article | null>(null);
    readonly #comments = createStore<Comment[]>([]);
    readonly isLoading = this.status.map((status) => status === 'loading');
    readonly isOwner = combine(
        { currentUser: this.#authService.user, article: this.article },
        ({ currentUser, article }) => !!article && !!currentUser && article.author.username === currentUser.username
    );
    readonly currentUserImage = this.#authService.user.map((currentUser) => currentUser?.image || '');

    readonly comments = combine(
        { currentUser: this.#authService.user, comments: this.#comments, isOwner: this.isOwner },
        ({ currentUser, comments, isOwner }) =>
            comments.map((comment) => ({
                ...comment,
                isOwner:
                    comment.author.username === currentUser?.username ||
                    // if the current logged in user is the author, they should have the ability to delete comments
                    // in other words, they are owners of all comments
                    isOwner,
            }))
    );

    // effects
    readonly #loadArticleFx = createEffect<string, [{ article: Article }, { comments: Comment[] }]>();
    readonly #toggleFavoriteFx = createEffect<Article, Article | null>();
    readonly #deleteArticleFx = createEffect<string, void>();
    readonly #followAuthorToggleFx = createEffect<Profile, Profile | null>();
    readonly #createCommentFx = createEffect<{ comment: string; article: Article }, { comment: Comment }>();
    readonly #deleteCommentFx = createEffect<{ commentId: number; article: Article }, void>();

    constructor() {
        sample({
            source: this.newArticleSelected,
            target: this.#loadArticleFx,
        });

        sample({
            source: this.#loadArticleFx,
            fn: () => 'loading' as const,
            target: this.status,
        });

        sample({
            source: this.#loadArticleFx.doneData,
            fn: () => 'success' as const,
            target: this.status,
        });

        sample({
            source: this.#loadArticleFx.fail,
            fn: () => 'error' as const,
            target: this.status,
        });

        sample({
            source: this.#loadArticleFx.doneData,
            fn: ([articleResponse]) => ({
                ...articleResponse.article,
                body: this.#domSanitizer.sanitize(SecurityContext.HTML, marked(articleResponse.article.body)) as string,
            }),
            target: this.article,
        });

        sample({
            source: this.#loadArticleFx.doneData,
            fn: ([, commentsResponse]) => commentsResponse.comments,
            target: this.#comments,
        });

        sample({
            source: this.#toggleFavoriteFx.doneData,
            filter: (response) => response !== null,
            target: this.article,
        });

        sample({
            clock: this.#followAuthorToggleFx.doneData,
            source: this.article,
            filter: (_, response): response is Profile => response !== null,
            fn: (article, newAuthor) => ({ ...article!, author: newAuthor! }),
            target: this.article,
        });

        sample({
            clock: this.commentCreated,
            source: this.article,
            filter: (article: Article | null): article is Article => article !== null,
            fn: (article, comment) => ({ article, comment }),
            target: this.#createCommentFx,
        });

        sample({
            clock: this.#createCommentFx.doneData,
            source: this.#comments,
            fn: (comments, response) => [...comments, response.comment],
            target: this.#comments,
        });

        sample({
            clock: this.deleteCommentClicked,
            source: this.article,
            filter: (article: Article | null): article is Article => article !== null,
            fn: (article, commentId) => ({ article, commentId }),
            target: this.#deleteCommentFx,
        });

        sample({
            clock: this.#deleteCommentFx.done,
            source: this.#comments,
            fn: (comments, { params }) => comments.filter((comment) => comment.id !== params.commentId),
            target: this.#comments,
        });

        this.#loadArticleFx.use((slug) =>
            Promise.all([
                this.#articlesApiClient.getArticle({ slug }),
                this.#commentsApiClient.getArticleComments({ slug }),
            ])
        );
        this.#toggleFavoriteFx.use((article) => this.#favoriteArticleService.toggleFavorite(article));
        this.#deleteArticleFx.use(async (slug) => {
            await this.#articlesApiClient.deleteArticle({ slug });
            void this.#router.navigate(['/']);
        });
        this.#followAuthorToggleFx.use((profile) => this.#followAuthorService.toggleFollow(profile));
        this.#createCommentFx.use(({ comment, article }) =>
            this.#commentsApiClient.createArticleComment({
                body: { comment: { body: comment } },
                slug: article.slug,
            })
        );
        this.#deleteCommentFx.use(({ commentId, article }) =>
            this.#commentsApiClient.deleteArticleComment({ id: commentId, slug: article.slug })
        );
    }
}
