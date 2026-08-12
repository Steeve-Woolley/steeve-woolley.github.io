/* ══════════════════════════════════════════════════════════════
   YOUR WORK LIVES HERE.

   This is the only file you need to touch to add a painting.
   Everything else — layout, the full-size viewer, the wall
   labels — takes care of itself.

   To add a piece:
     1. Put the photo in the  images/  folder
     2. Copy one { ... } block below
     3. Paste it and change the six lines inside

   Rules that will save you a headache:
     • Every block ends with a comma  ,
     • Every line inside ends with a comma too
     • Text goes inside "quotes"
     • true / false never get quotes

   The "tone" line is a backup colour. If a photo is missing or
   slow to load, that colour fills the frame instead of a broken
   icon. Pick something close to the painting's overall hue —
   eyedropper it in Photoshop, or just guess warm or cool.

   Exactly ONE piece should have  featured: true  — that's the
   painting that greets people at the top of the page.
   ══════════════════════════════════════════════════════════════ */


const PAINTINGS = [

  {
    title: "Orchard, evening",
    year: "2025",
    medium: "Oil on linen",
    size: "24 × 30 in",
    image: "images/orchard-evening.jpg",
    tone: "#6E7B6A",
    featured: true,
  },

  {
    title: "Still life with pears",
    year: "2025",
    medium: "Oil on panel",
    size: "12 × 16 in",
    image: "images/still-life-pears.jpg",
    tone: "#A8724C",
  },

  {
    title: "North window",
    year: "2024",
    medium: "Oil on canvas",
    size: "18 × 24 in",
    image: "images/north-window.jpg",
    tone: "#4A5A72",
  },

  {
    title: "Untitled (kitchen table)",
    year: "2024",
    medium: "Oil on board",
    size: "9 × 12 in",
    image: "images/kitchen-table.jpg",
    tone: "#8C6F55",
  },

];


const DRAWINGS = [

  {
    title: "Seated figure, twenty minutes",
    year: "2025",
    medium: "Charcoal on newsprint",
    size: "18 × 24 in",
    image: "images/seated-figure.jpg",
    tone: "#6D675C",
  },

  {
    title: "Two bottles",
    year: "2025",
    medium: "Graphite on paper",
    size: "8 × 10 in",
    image: "images/two-bottles.jpg",
    tone: "#7E7767",
  },

  {
    title: "Standing figure, back",
    year: "2024",
    medium: "Conté on toned paper",
    size: "18 × 24 in",
    image: "images/standing-figure-back.jpg",
    tone: "#8A7C6A",
  },

];
