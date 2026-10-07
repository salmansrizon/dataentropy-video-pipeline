import React from 'react';
import {Composition} from 'remotion';
import {KMeansVideo} from './KMeansVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="KMeansExplainer"
		component={KMeansVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
