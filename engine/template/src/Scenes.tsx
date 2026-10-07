import React from 'react';
import {C, Card, Chip, Mark, camTrack, layout, timeline} from '@dataentropy/engine';
import type {Content, Format, Words} from '@dataentropy/engine';

// The world of this video. Replace the placeholder with the objects this video needs, built from the engine
// blocks (Card, Table, Chip, CodeLine, Mark, Ring, Flyer, ...). Rules that tools/check.py enforces:
//   - key every animation to a scene start (S[i] + frames) or to a spoken word (at(i, 'name', fallback));
//   - elements appear by fading, wiping or drawing, never by rising or scaling;
//   - use only brand colours (C.*) and text of at least 24 px;
//   - list every animation in ../motion-inventory.json.

export const scenes = (content: Content, words: Words) => {
	const {S, at} = timeline(content, words);
	const L = layout(content.format as Format);
	const Z = L.zone; // the area between headline and captions, in world coordinates at camera scale 1

	// Camera stops are [start frame, x, y, scale]; a stop with scale above 1 pushes in on what is being explained.
	const camera = (f: number) => camTrack(f, [L.cx, L.cy, 1], [[S[1], L.cx, L.cy, 1.04]]);

	const card = {x: Z.x + 60, y: Z.y + Z.h / 2 - 150, w: Z.w - 120, h: 300};
	const world = (f: number) => (
		<>
			<Card f={f} at={S[0] + 4} {...card}>
				<text x={card.x + card.w / 2} y={card.y + 130} fontSize={44} fontWeight={600} textAnchor="middle" fill={C.navy}>Your first object goes here</text>
				<Mark f={f} at={at(1, 'point', 20)} x={card.x + 40} y={card.y + 164} w={card.w - 80} h={56} />
				<text x={card.x + card.w / 2} y={card.y + 204} fontSize={36} fontWeight={500} textAnchor="middle" fill={C.navy}>highlighted on a spoken word</text>
			</Card>
			<Chip f={f} at={S[1] + 40} id="note" x={card.x} y={card.y + card.h + 30} w={320} text="a label chip" />
		</>
	);
	return {camera, world};
};
