# steevewoolley.github.io

My painting site. Lives at **https://steevewoolley.github.io**

## What each file does

| File | What it's for |
|---|---|
| `works.js` | **The only file I normally edit.** The list of paintings and drawings. |
| `index.html` | Page structure — my name, the About text, the nav. |
| `style.css` | Colours, type, spacing. All the colours are at the very top. |
| `gallery.js` | Hangs the work and runs the full-size viewer. Leave alone. |
| `images/` | The photographs. |

## Adding a painting

1. Drop the photo into `images/`
2. Open `works.js`, copy an existing `{ ... }` block, paste it, change the details
3. In GitHub Desktop: write a short summary → **Commit to main** → **Push origin**
4. Wait about a minute, then reload the site

## Turning the site on (one time only)

Repo → **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: **main** → Folder: **/ (root)** → **Save**

## Photographing the work

- Overcast daylight, or two lamps at 45° on either side — never direct sun
- Camera square to the painting, dead centre, not tilted
- Turn the flash off; use a tripod or brace the phone
- Crop to the edge of the canvas, no wall or floor showing
- Save as JPG, around 2000px on the long side, under about 500 KB each

Big files make the site slow to load. If a photo comes off the camera at 8 MB, shrink it before adding it.

## Filenames

Lowercase, hyphens instead of spaces, no accents:

- `orchard-evening.jpg` ✓
- `Orchard Evening (final).JPG` ✗

Spaces and capitals work on my laptop but break on the live site. This catches everyone once.
