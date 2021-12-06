import { $, $$ } from '@sciter';
import { cwd } from '@sys';

/** No idea how this works. */
function pctToRad(pct) {
  pct += 75;
  const degToRad = (deg) => deg * (Math.PI / 180.0);
  return degToRad((pct / 100) * 360);
}

/**
 * @param {{ countryName: String, percent: Number }[]} countries
 */
export default async function drawWheel(countries) {
  const URLS = countries.map(
    ({ countryName }) =>
      `${cwd().replace(
        /\\/g,
        '/'
      )}/resources/images/png/flags/countries/512x512/${countryName.replace(
        / /g,
        '-'
      )}.png`
  );

  const IMAGES = [];

  for (const [i, URL] of Object.entries(URLS)) {
    try {
      const image = await Graphics.Image.load(URL);
      IMAGES.push(image);
    } catch (e) {
      console.log(e);
      Window.this.modal(
        <alert caption="Warning">
          "{countries[i].countryName.replace(/ /g, '-')}.png" not found!
        </alert>
      );
      const dummy = new Graphics.Image(512, 512, function () {}, 'white');
      IMAGES.push(dummy);
    }
  }

  const PCTS = countries.map(({ percent }) => percent);

  $('#wheel').paintContent = function (gfx) {
    let ROTATION = 0;
    for (let i = 0; i < IMAGES.length; i++) {
      const image = IMAGES[i];
      const PERCENT = PCTS[i];

      const _clipPath = new Graphics.Path();
      _clipPath.moveTo(60, 60);

      const start = pctToRad(ROTATION);
      const end = pctToRad(PERCENT + ROTATION);

      ROTATION += PERCENT;

      _clipPath.arc(60, 60, 60, start, end);
      _clipPath.close();

      const clipPath = new Graphics.Path();

      clipPath.ellipse(120 / 2, 120 / 2, 56, 56, 0, 0, 360);

      gfx.pushLayer(clipPath.combine('intersect', _clipPath));

      gfx.draw(image, {
        x: 0,
        y: 0,
        width: 120,
        height: 120,
        srcX: 0,
        srcY: 0,
        srcWidth: 512,
        srcHeight: 512,
        opacity: 1,
      });

      gfx.popLayer();
    }

    gfx.fillStyle = Graphics.Color.rgb(1, 1, 1, 1);
    let red = new Graphics.Path();
    red.ellipse(120 / 2, 120 / 2, 25, 25, 0, 0, 360, false);
    gfx.stroke(red);
    gfx.fill(red);
  };

  $('#wheel').requestPaint();
}
