# Workspace Notes

- App: Forma Studio, a React + TypeScript + Vite parametric ceramic vessel configurator.
- Use Three.js for the interactive model and STL export.
- STL geometry dimensions are in millimeters; UI dimensions are in centimeters except wall thickness in millimeters.
- The app has two tabs: full positive vessel, and "Meia peça" (half of the piece cut on the handle plane, on a flat plate with 4 hemispherical registration keys; plate lies in the XY plane, piece protrudes toward +Z).
- Geometry is the fired size grown by clay shrinkage (default 12%); the half-piece tab adds a slip well, optional containment walls (separate STL) and a plaster/water estimate.
- Containment walls are a separate STL; automatic multi-part mold generation is not implemented.
- Forms: jarra (handle), vaso, copo and gato (egg body with a head, two ears cut by the split plane in the half piece, optional engraved face). Ears and face live in catShape/makeEars/catFaceHeight.
- Handle styles (clássica, argola, pérolas, trançada, cauda, pata) and applied objects (src/attachments.ts) work on every form; handles and "split" objects lie in the split plane so each mold half holds half of them, "front" objects are reliefs on the body.
- Surface textures (src/patterns.ts: textures, shapes, flowers, floral silhouettes, arabesques, animals, bugs, or an uploaded image) displace the outer lathe surface radially; in the half piece the relief fades near the split plane. STL export is binary.