import { Injectable, inject } from '@angular/core';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { TagsApiClient } from '../shared-data-access-api';
import { ApiStatus } from '../shared-data-access-models/api-status';

@Injectable()
export class TagsService {
    readonly #tagsApiClient = inject(TagsApiClient);

    // events
    readonly getTagsRequested = createEvent();

    // stores
    readonly status = createStore<ApiStatus>('idle');
    readonly tags = createStore<string[]>([]);

    // effects
    readonly #tagsGetFx = createEffect<void, { tags: string[] }>();

    constructor() {
        sample({
            source: this.getTagsRequested,
            fn: () => 'loading' as const,
            target: this.status,
        });

        sample({
            source: this.getTagsRequested,
            target:  this.#tagsGetFx
        });
        
        sample({
            clock: this.#tagsGetFx.doneData,
            fn: (response) => response.tags,
            target: this.tags,
        });

        sample({
            source: this.getTagsRequested,
            fn: () => 'success' as const,
            target: this.status,
        });

        sample({
            clock: this.#tagsGetFx.failData,
            fn: () => 'error' as const,
            target: [this.status, this.tags.reinit!],
        });

        this.#tagsGetFx.use(() => this.#tagsApiClient.getTags());
    }
}
