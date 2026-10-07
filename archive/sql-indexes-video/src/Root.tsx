import React from 'react';
import {Composition} from 'remotion';
import {SqlIndexesVideo} from './SqlIndexesVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlIndexesExplainer"
		component={SqlIndexesVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
