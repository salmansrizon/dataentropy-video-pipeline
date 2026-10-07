import React from 'react';
import {Composition} from 'remotion';
import {SqlWriteVideo} from './SqlWriteVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlWriteExplainer"
		component={SqlWriteVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
