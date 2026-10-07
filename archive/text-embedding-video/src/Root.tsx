import React from 'react';
import {Composition} from 'remotion';
import {TextEmbeddingVideo} from './TextEmbeddingVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition id="TextEmbeddingExplainer" component={TextEmbeddingVideo} durationInFrames={content.durationSeconds * content.fps} fps={content.fps} width={1080} height={1920} />
);
