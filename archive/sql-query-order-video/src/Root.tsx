import React from 'react';
import {Composition} from 'remotion';
import {SqlQueryOrderVideo} from './SqlQueryOrderVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlQueryOrderExplainer"
		component={SqlQueryOrderVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
