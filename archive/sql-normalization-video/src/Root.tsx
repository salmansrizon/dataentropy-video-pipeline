import React from 'react';
import {Composition} from 'remotion';
import {SqlNormalizationVideo} from './SqlNormalizationVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlNormalizationExplainer"
		component={SqlNormalizationVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
