import React from 'react';
import {Composition} from 'remotion';
import {SqlOrderByVideo} from './SqlOrderByVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlOrderByExplainer"
		component={SqlOrderByVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
