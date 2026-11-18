# Invitation delivery artwork optimization

Use same-size JPEG delivery copies of the approved artwork: desktop 598×784 / 153,430 bytes; mobile 260×340 / 46,853 bytes. Combined 200,283 bytes, down 71% from 698,051 bytes. Encoding is quality 90, optimized, 4:4:4. Logo, lettering and layout were visually checked at intended image sizes. PNG originals remain at their original URLs and retain their hash/provenance contracts for older emails. The canonical invitation points only its hero images to JPEG; personalized invitation URLs and unsubscribe behavior are unchanged.

## Release and publication gates

Code merge is not an email publication. Do not retry the previously denied manual release without resolved approval. Once authorized: use the normal release/test/prod workflows; verify both JPEG URLs return image/jpeg and the pinned bytes/dimensions; retain PNG URLs; verify the live source preview uses JPEG in both modes.

The Company OS stored invitation is separate from frontend source. Current stored body/hash is not yet verified. The Hub's Create stored draft snapshots existing stored content, not an automatic import of new frontend source. Obtain authorized current stored readback, update only the intended invitation through its supported draft/import path, compare HTML/text and all link substitutions, review/approve and publish through application controls only with appropriate authorization. Verify published stored hash and a separately authorized test before declaring outgoing email ready. No bulk send is implied.

Current work changes assets/source only. No deployment, stored-template update/publication, account creation or email sending is performed by this change.
