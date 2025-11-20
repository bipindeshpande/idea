# Templates Directory

This directory contains all downloadable framework templates as separate markdown files.

## Structure

Each template is stored as a separate `.md` file:
- `problem-validation-checklist.md`
- `customer-interview-script.md`
- `landing-page-test-framework.md`
- `pricing-validation-method.md`
- `mvp-prioritization-matrix.md`
- `competitive-analysis-template.md`

## Configuration

The `frameworksConfig.js` file:
- Imports all template content using Vite's `?raw` import
- Defines metadata (title, description, category, icon) for each template
- Exports a `frameworks` array used by `Frameworks.jsx` and `Resources.jsx`

## Editing Templates

To edit a template:
1. Open the corresponding `.md` file in this directory
2. Make your changes
3. Save the file
4. The changes will be reflected immediately (no need to update the component)

## Adding New Templates

1. Create a new `.md` file in this directory
2. Add the template content
3. Update `frameworksConfig.js`:
   - Import the new template: `import newTemplate from "./new-template.md?raw";`
   - Add a new object to the `frameworks` array with:
     - `id`: Next sequential number
     - `title`: Display title
     - `description`: Short description
     - `category`: Category name
     - `icon`: Emoji icon
     - `download`: `true`
     - `content`: The imported template content

## Usage

Templates are used in:
- `frontend/src/pages/Frameworks.jsx` - Dedicated frameworks page
- `frontend/src/pages/Resources.jsx` - Resources page (displays frameworks inline)

Both pages import from `frameworksConfig.js`.

