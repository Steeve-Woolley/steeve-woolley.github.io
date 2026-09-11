/* ══════════════════════════════════════════════════════════════
   YOUR WORK LIVES HERE.

   This is the only file you need to touch to add a painting.

   To add a piece:
     1. Put the photo in the  images/  folder
     2. Copy one { ... } block below
     3. Paste it and change the lines inside

   Rules that will save you a headache:
     • Every block ends with a comma  ,
     • Every line inside ends with a comma too
     • Text goes inside "quotes"
     • true / false never get quotes
     • JPG only. Never .heic — most browsers show nothing at all.
     • Filenames: lowercase, hyphens, no spaces. Always.

   SIZES ARE HEIGHT × WIDTH. That's the gallery standard, and
   every entry below follows it. Keep it consistent — a size
   listed the wrong way round follows a painting forever, onto
   submission forms, invoices, and price lists.

   "tone"    backup colour, shown if a photo is missing or slow.
   "alt"     plain description of the picture. Blind visitors hear
             this read aloud, and Google reads it too. Worth doing.
   "details" optional close-ups. Leave the line out if there are none.

   ORDER IS EVERYTHING. The list below is the order the paintings
   hang on the wall, left to right, and visitors always start at
   the far left on the first one. To change what greets people,
   move that painting's block to the top.
   ══════════════════════════════════════════════════════════════ */


const PAINTINGS = [

  {
    title: "Night Stand",
    year: "2026",
    medium: "Oil on canvas",
    size: "16 × 12 in",
    image: "images/night-stand.jpg",
    tone: "#4A4238",
  },

  {
    title: "Sycamore Jump",
    year: "2026",
    medium: "Oil on canvas",
    size: "20 × 16 in",
    image: "images/sycamore-jump.jpg",
    tone: "#77805C",
  },

  {
    title: "Little Green Table",
    year: "2026",
    medium: "Oil on canvas",
    size: "24 × 20 in",
    image: "images/little-green-table.jpg",
    alt: "A room interior with a small green table and houseplants.",
    tone: "#6B7A5E",

    details: [
      { image: "images/little-green-table-detail-1.jpg", note: "Close view of the table" },
    ],
  },

  {
    title: "Bay Front",
    year: "2026",
    medium: "Oil on canvas",
    size: "20 × 24 in",
    image: "images/bay-front.jpg",
    alt: "The Hamilton bayfront at golden hour, water and sky lit low and warm.",
    tone: "#B5813F",
  },

  {
    title: "My Boy",
    year: "2026",
    medium: "Oil on canvas",
    size: "16 × 12 in",
    image: "images/my-boy.jpg",
    alt: "Portrait of Cassian, the artist's dog, at two years old.",
    tone: "#7A5C42",
  },

  {
    title: "Self Portrait",
    year: "2026",
    medium: "Oil on canvas",
    size: "24 × 18 in",
    image: "images/self-portrait.jpg",
    alt: "Self portrait of the artist with a wet afro.",
    tone: "#4E3B30",
  },

  {
    title: "Glass House",
    year: "2024",
    medium: "Oil on canvas",
    size: "16 × 12 in",
    image: "images/glass-house.jpg",
    alt: "Still life of a plant terrarium beside a window in a brick apartment.",
    tone: "#8A6A55",
  },

];


/* Your life drawings and still life studies go here when you're
   ready. While this list is empty the Drawings section stays
   hidden — nobody sees an empty room.

   Copy the shape of a painting block above:

   {
     title: "Seated figure, twenty minutes",
     year: "2026",
     medium: "Charcoal on newsprint",
     size: "24 × 18 in",
     image: "images/seated-figure.jpg",
     alt: "Quick charcoal study of a seated figure.",
     tone: "#6D675C",
   },
*/

const DRAWINGS = [

];
