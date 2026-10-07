import React from 'react';
import {Composition} from 'remotion';
import {SqlCteVideo} from './SqlCteVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlCteExplainer"
		component={SqlCteVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);
