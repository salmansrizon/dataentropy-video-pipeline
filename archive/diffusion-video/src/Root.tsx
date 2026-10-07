import React from 'react';
import {Composition} from 'remotion';
import {DiffusionVideo} from './DiffusionVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="DiffusionExplainer"
		component={DiffusionVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
