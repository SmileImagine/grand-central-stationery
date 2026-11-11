# Licences of bundled libraries and samples

## abcjs 6.7.0 (vendor/abcjs-basic-min.js)

https://github.com/paulrosen/abcjs

```
Copyright (c) 2009-2026 Paul Rosen and Gregory Dyke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

**This text is from: http://opensource.org/licenses/MIT**
```

## impress.js 2.0.0 (vendor/impress.js)

https://github.com/impress/impress.js

```
The MIT License (MIT)

Copyright (c) 2011-2016 Bartek Szopka

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## midi-js-soundfonts (vendor/soundfont/): the FluidR3_GM acoustic_grand_piano (also embedded as base64 in piano-embedded.js), recorder, acoustic_guitar_nylon and electric_piano_1 sets (recorder and guitar notes normalised to one level), the acoustic_bass set and the percussion notes the accompaniment uses, one set so the instruments sit at the same level

https://github.com/gleitz/midi-js-soundfonts

```
Copyright (C) 2012 Benjamin Gleitzman (gleitz@mit.edu)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Versilian Studios sample libraries (vendor/soundfont/vcsl_*, vsco_*): CC0 1.0, public domain

The Kawai grand piano (Sustains, the v3 layer), the Baroque soprano recorder (Sustain), the hi-hat, the modern snare 1
and toms 1 and 2 (stick hits; the floor tom is tom 2 played a fourth lower), each drum in two takes and the snare, closed
hat and toms at three strengths, from the Versilian Community Sample Library (VCSL); and from VSCO 2 Community Edition the solo double bass pizzicato
(v1 rr1), the solo violin (Arco Vib, f), the trumpet (sus, v3), the tuba (stac, v2 rr1), the glockenspiel, the marimba
and the xylophone; by Versilian Studios LLC (Sam Gossner). Converted by `vendor/soundfont/build-cc0.js`: mono, trimmed, levelled,
96 kbps MP3. No attribution is required; this is a thank-you.

https://github.com/sgossner/VCSL and https://versilian-studios.com/vcsl/
https://github.com/sgossner/VSCO-2-CE and https://versilian-studios.com/vsco-community/

```
CC0 1.0 Universal: the person who associated a work with this deed has dedicated the work to the public domain by
waiving all of his or her rights to the work worldwide under copyright law, including all related and neighboring
rights, to the extent allowed by law. https://creativecommons.org/publicdomain/zero/1.0/
```

## Groove MIDI Dataset (the drummer's fills in index.html, GMD_FILLS): CC BY 4.0

The Band's drummer plays fills taken from the Groove MIDI Dataset, performances by ten drummers recorded on a Roland
TD-11 electronic kit, by Magenta (Google): Jon Gillick, Adam Roberts, Jesse Engel, Douglas Eck and David Bamman,
"Learning to Groove with Inverse Sequence Transformations", International Conference on Machine Learning (ICML), 2019.
https://magenta.tensorflow.org/datasets/groove

Changes: `vendor/build-fills.js` keeps the last bar of each take marked "fill", cuts it where the fill starts, places
each hit on a sixteenth or triplet grid with its velocity (in nine steps) and its timing against the grid, drops fills
alike in their hits, and keeps twelve of each length in each genre (with a few more on the snare alone and on the
triplet grid). The page plays them on its own kit, at its own tempo and level, in place of the groove's last beats.

```
Creative Commons Attribution 4.0 International (CC BY 4.0). You are free to share and adapt the material for any
purpose, even commercially, as long as you give appropriate credit, provide a link to the license, and indicate if
changes were made. https://creativecommons.org/licenses/by/4.0/
```
