# 4G Steel Enterprise public gallery

This is a static HTML, CSS, and JavaScript site for GitHub Pages. The gallery is public: there is no sign-in, private audience, server-side upload, or access control. Anyone who can visit the site can view and download every photo and video in `media/`.

## Publish with GitHub Pages

1. In the `4g-steel-gallery` GitHub repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
3. Wait for the Pages deployment to finish. The project site URL is `https://abbew-williams.github.io/4g-steel-gallery/`.

GitHub Pages serves this static site from a public repository. Keep private photos, account data, and credentials out of this repository.

## Add or remove gallery media

1. Put supported photo and video files in the `media/` folder. Supported formats depend on the visitor's browser; JPEG, PNG, WebP, GIF, MP4, and WebM are recommended.
2. Add an entry for each file in `media/media.json`:

   ```json
   [
     {
       "name": "A moment to remember",
       "kind": "image",
       "src": "media/photo.jpg"
     },
     {
       "name": "A short video",
       "kind": "video",
       "src": "media/clip.mp4"
     }
   ]
   ```

   The `src` must start with `media/` and point to a file in that folder. Use `kind: "image"` for photos or `kind: "video"` for videos. Keep the JSON valid.
3. Commit the files and wait for GitHub Pages to rebuild.

Files committed to GitHub become downloadable. Avoid very large videos: the GitHub web uploader has file-size limits, and visitors' download speed and mobile data use may be affected.

## Local preview

Open `index.html` for the welcome page. To test the gallery, use a local static HTTP server from the project folder so the browser can fetch `media/media.json`; for example, with Python installed:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.
