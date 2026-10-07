import React from 'react';
import {Composition} from 'remotion';
import {LlmVideo} from './LlmVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition id="LlmExplainer" component={LlmVideo} durationInFrames={content.durationSeconds * content.fps} fps={content.fps} width={1080} height={1920} />
);
