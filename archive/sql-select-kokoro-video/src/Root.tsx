import React from 'react';
import {Composition} from 'remotion';
import {SqlSelectVideo} from './SqlSelectVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlSelectExplainer"
		component={SqlSelectVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
