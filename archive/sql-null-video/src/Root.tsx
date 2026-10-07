import React from 'react';
import {Composition} from 'remotion';
import {SqlNullVideo} from './SqlNullVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlNullExplainer"
		component={SqlNullVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
