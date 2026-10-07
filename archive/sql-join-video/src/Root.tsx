import React from 'react';
import {Composition} from 'remotion';
import {SqlJoinVideo} from './SqlJoinVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlJoinExplainer"
		component={SqlJoinVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
