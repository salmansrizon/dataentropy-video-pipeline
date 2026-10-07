import React from 'react';
import {Composition} from 'remotion';
import {SqlGroupbyVideo} from './SqlGroupbyVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlGroupbyExplainer"
		component={SqlGroupbyVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
