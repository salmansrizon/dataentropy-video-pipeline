import React from 'react';
import {Composition} from 'remotion';
import {Explainer, layout} from '@dataentropy/engine';
import type {Format, Words} from '@dataentropy/engine';
import content from './content.json';
import words from './words.json';
import {scenes} from './Scenes';

// One composition per video, always called "Video". Size and length come from content.json.
const {camera, world} = scenes(content, words as Words);
const L = layout(content.format as Format);
const Video: React.FC = () => <Explainer content={content} words={words as Words} camera={camera} world={world} />;

export const RemotionRoot: React.FC = () => (
	<Composition id="Video" component={Video} durationInFrames={Math.round(content.durationSeconds * content.fps)} fps={content.fps} width={L.W} height={L.H} />
);
