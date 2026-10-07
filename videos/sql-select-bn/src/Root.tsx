import React from 'react';
import {Composition} from 'remotion';
import {Explainer, layout} from '@dataentropy/engine';
import type {Format, Words} from '@dataentropy/engine';
import content from './content.json';
import words from './words.json';
import {selectScenes} from '../../sql-select/src/Scenes';
import type {SelectContent} from '../../sql-select/src/Scenes';

// The Bangla version: the same scenes as videos/sql-select, with its own script, cues and voice.
// One composition per video, always called "Video". Size and length come from content.json.
const {camera, world} = selectScenes(content as unknown as SelectContent, words as Words);
const L = layout(content.format as Format);
const Video: React.FC = () => <Explainer content={content} words={words as Words} camera={camera} world={world} />;

export const RemotionRoot: React.FC = () => (
	<Composition id="Video" component={Video} durationInFrames={Math.round(content.durationSeconds * content.fps)} fps={content.fps} width={L.W} height={L.H} />
);
