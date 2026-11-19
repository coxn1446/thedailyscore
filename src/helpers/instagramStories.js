import { registerPlugin } from '@capacitor/core';

const InstagramStories = registerPlugin('InstagramStories');

export const shareToInstagramStory = (image) => InstagramStories.share({ image });
