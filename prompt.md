# PROJECT: REBRAND STUDIO – AI-POWERED BULK IMAGE REBRANDING APPLICATION

Act as a senior full-stack engineer, computer vision engineer, AI integration specialist and product designer.

Your task is to design and build a fully functional, production-quality web application called **Rebrand Studio**.

Do not create just a frontend prototype. Build a working application with real image uploads, image processing, custom logo positioning, background reconstruction, batch processing and downloadable results.

The application is intended for users who own or have permission to modify the uploaded images and branding.

# 1. CORE OBJECTIVE

Build an application that allows users to:

1. Upload approximately 20–30 images simultaneously.
2. Upload their replacement company logo or branding asset.
3. Identify the existing logo in each image.
4. Select or automatically detect the old logo region.
5. Remove the old logo and reconstruct the underlying background.
6. Place their replacement logo anywhere on the image.
7. Customize the size, position, rotation, opacity and blending.
8. Apply settings across multiple images or customize individual images.
9. Preview the final results.
10. Download all processed images together in a ZIP file.

The entire process should be simple, intuitive and efficient.

# 2. TECHNOLOGY STACK

Frontend:
- React
- Vite
- TypeScript
- Tailwind CSS
- Lucide React
- React Konva or Fabric.js for interactive canvas editing.

Backend:
- Python
- FastAPI
- Pillow
- OpenCV
- NumPy

Processing:
- OpenCV inpainting for basic background reconstruction.
- Support integration with a generative AI inpainting API for complex backgrounds.
- Background job processing for multiple images.
- ZIP generation for batch exports.

Architecture:
- Separate frontend and backend.
- Modular and maintainable code.
- Environment variables for API credentials.
- Local processing and storage for the initial MVP.

# 3. USER INTERFACE AND EXPERIENCE

Create a premium SaaS-style interface.

Design inspiration:
- Modern creative editing software.
- Minimal Apple-inspired aesthetics.
- Clean typography.
- Neutral backgrounds.
- Subtle shadows and borders.
- Rounded cards and smooth transitions.
- Responsive layouts.
- Excellent empty states and loading states.

The application should feel like a professional image editing product rather than a basic file upload utility.

Main navigation:

- Dashboard
- New Project
- Recent Projects
- Settings

# 4. IMAGE UPLOAD SYSTEM

Build a drag-and-drop image upload interface.

Requirements:
- Upload multiple images simultaneously.
- Support JPG, JPEG, PNG and WEBP.
- Initially support up to 30 images per project.
- Display thumbnails of uploaded images.
- Display image dimensions, filenames and file sizes.
- Allow users to remove individual images.
- Allow users to add more images after initial upload.
- Preserve the original uploaded files.
- Validate file types and sizes.
- Handle large-resolution images efficiently.

After uploading, show all images in a gallery/grid layout.

# 5. REPLACEMENT LOGO UPLOAD

Allow users to upload their replacement logo.

Requirements:
- Support transparent PNG and SVG where safely supported.
- Preview the uploaded logo.
- Preserve transparency.
- Maintain the original aspect ratio.
- Allow users to replace the uploaded logo.
- Allow users to adjust logo size and opacity.
- Support optional logo shadows and blending effects.

The uploaded replacement logo should be available throughout the entire editing session.

# 6. EXISTING LOGO IDENTIFICATION

Users must have two options.

A. Manual selection:
- Allow users to select the existing logo region directly on the image.
- Provide rectangle and freeform selection tools.
- Allow users to adjust the selection.
- Support zooming for accurate selection.

B. Automatic detection:
- Provide an optional AI-powered logo detection system.
- Identify possible existing logo regions.
- Highlight detected regions.
- Allow users to confirm or correct the selection before removal.

Important:
Different images may have logos in different positions. Never assume that all existing logos occupy the same coordinates.

Do not automatically erase unrelated image content.

# 7. OLD LOGO REMOVAL AND BACKGROUND RECONSTRUCTION

This is one of the application's most important features.

After selecting the old logo:

1. Generate a mask covering the selected logo.
2. Allow the user to refine the mask.
3. Remove the logo using OpenCV inpainting.
4. Provide an optional generative AI inpainting integration for complex backgrounds.
5. Reconstruct the background as naturally as possible.
6. Preserve image dimensions and visual quality.

Provide:
- Before/after comparison.
- Zoomable preview.
- Undo and retry functionality.
- Manual mask correction.
- Ability to process the image again with a different method.

Do not claim that conventional inpainting can perfectly reconstruct every background. Clearly handle difficult cases.

Design the backend so that different inpainting providers can be integrated without rewriting the application.

# 8. ADVANCED CUSTOM LOGO POSITIONING – MANDATORY

This is a critical feature.

Do not restrict users to predefined logo positions such as top-left, bottom-right or center.

Users must have complete freedom to position the replacement logo anywhere on the image.

Build a fully interactive image editor using React Konva or Fabric.js.

The editing canvas must support:

A. Drag and drop:
- Users can drag the logo anywhere on the image.
- Allow positioning in the center, corners, edges or any custom location.
- Provide precise positioning.

B. Resizing:
- Interactive corner handles.
- Freely adjustable size.
- Maintain aspect ratio by default.
- Optional ability to unlock aspect ratio.

C. Rotation:
- Freely rotate the logo.
- Support precise rotation adjustments.

D. Opacity and appearance:
- Opacity slider from 0–100%.
- Optional shadow.
- Optional blending effects.
- Optional border or outline.
- Support transparent logos.

E. Canvas controls:
- Zoom in.
- Zoom out.
- Fit image to screen.
- Pan around the image.
- Undo.
- Redo.
- Reset placement.

F. Real-time preview:
- Show the replacement logo directly on the image.
- All changes must appear immediately.
- The exported image must match the preview accurately.

G. Technical positioning:
- Store logo coordinates as normalized image-relative coordinates.
- Do not store positions as browser screen pixels.
- Ensure positioning works correctly across images with different resolutions and aspect ratios.
- Preserve logo dimensions and proportions during export.

# 9. BATCH POSITIONING AND INDIVIDUAL EDITING

Provide two different editing modes.

GLOBAL MODE:

- Apply the same logo position to all selected images.
- Apply the same logo scale.
- Apply the same opacity.
- Apply the same rotation.
- Allow users to change the global settings at any time.

INDIVIDUAL MODE:

- Allow users to select an individual image.
- Position its logo independently.
- Resize and rotate independently.
- Adjust opacity independently.
- Preview each result individually.

Additional functionality:

- Copy positioning settings from one image.
- Paste positioning settings onto another image.
- Save positioning presets.
- Apply presets to selected images.
- Switch between images without losing unsaved changes.

Important: Global positioning should use normalized coordinates so that the logo scales and positions proportionally across different image resolutions.

# 10. IMAGE EDITING WORKSPACE

Build a professional workspace with:

LEFT SIDEBAR:
- Uploaded image gallery.
- Image selection.
- Processing status.
- Add more images.

CENTER:
- Large interactive editing canvas.
- Before/after preview.
- Zoom and pan controls.

RIGHT SIDEBAR:
- Logo upload.
- Logo position.
- Width and height.
- Rotation.
- Opacity.
- Blending settings.
- Removal settings.
- Global/individual mode.

BOTTOM:
- Previous image.
- Next image.
- Save changes.
- Process image.
- Process all images.

Ensure the interface remains usable on smaller screens.

# 11. BATCH PROCESSING ENGINE

Allow users to process all uploaded images.

Requirements:
- Process images individually through background jobs.
- Display progress for each image.
- Display overall batch progress.
- Show completed, processing and failed states.
- Allow failed images to be retried.
- Allow users to continue editing other images while processing.
- Prevent duplicate processing jobs.
- Avoid excessive memory consumption.
- Use sensible concurrency limits.

Do not freeze the frontend during processing.

# 12. OUTPUT AND EXPORT

After processing:

- Display all completed images in a gallery.
- Allow full-size preview.
- Allow individual image downloads.
- Allow users to compare before and after.
- Provide a Download All button.
- Generate a ZIP containing all processed images.
- Preserve original filenames where possible.
- Allow users to choose PNG, JPEG or WEBP output.
- Provide quality settings for lossy formats.
- Preserve original dimensions by default.

Never overwrite original uploaded images.

# 13. BACKEND API

Implement clean and documented FastAPI endpoints.

Suggested endpoints:

POST /api/upload

POST /api/detect-logo

POST /api/create-mask

POST /api/remove-logo

POST /api/apply-logo

POST /api/process-image

POST /api/process-batch

GET /api/job-status/{job_id}

GET /api/project/{project_id}

GET /api/download/{job_id}

Implement:
- Input validation.
- Error handling.
- Temporary file cleanup.
- Safe file naming.
- Job tracking.
- Processing status.
- Appropriate file-size limits.

Use WebSockets or polling for processing progress.

# 14. PROJECT DATA MANAGEMENT

Create a project-based workflow.

Each project should contain:
- Uploaded images.
- Replacement logo.
- Original images.
- Logo selection masks.
- Logo positioning settings.
- Processing configurations.
- Final processed images.
- Processing statuses.

For the initial version, use local storage and a lightweight database such as SQLite.

Design the architecture so that cloud storage and user authentication can be added later.

# 15. SECURITY AND PERFORMANCE

- Validate all uploaded files.
- Do not trust file extensions alone.
- Limit upload sizes.
- Protect against path traversal.
- Sanitize filenames.
- Restrict image processing resource consumption.
- Keep API keys in environment variables.
- Never expose API credentials to the frontend.
- Use temporary storage with cleanup.
- Avoid unnecessary image recompression.
- Preserve original images.
- Handle corrupted files gracefully.

# 16. DEVELOPMENT AND IMPLEMENTATION PROCESS

Build this application incrementally.

STAGE 1 – Foundation:
- Set up frontend and backend.
- Establish API communication.
- Build dashboard.
- Implement multiple image uploads.
- Implement logo upload.

STAGE 2 – Image Editing:
- Build interactive canvas.
- Implement drag-and-drop positioning.
- Implement resizing and rotation.
- Implement opacity.
- Implement zoom and pan.
- Implement undo and redo.

STAGE 3 – Logo Removal:
- Implement manual selection.
- Implement mask generation.
- Implement OpenCV inpainting.
- Integrate optional generative inpainting.
- Add before/after previews.

STAGE 4 – Batch Processing:
- Implement global positioning.
- Implement individual positioning.
- Implement batch processing.
- Implement progress indicators.
- Implement retries.

STAGE 5 – Export:
- Generate output images.
- Implement ZIP export.
- Implement individual downloads.
- Test output quality and dimensions.

STAGE 6 – Testing:
- Test with 1 image.
- Test with 5 images.
- Test with 30 images.
- Test images with different resolutions.
- Test different logo positions.
- Test transparent logos.
- Test complex and simple backgrounds.
- Test failed processing and retries.
- Verify that exported images match the preview.

# 17. IMPORTANT DEVELOPMENT RULES

1. Build a genuinely functional application, not a static mockup.
2. Do not leave important buttons non-functional.
3. Do not use fake processing progress.
4. Do not claim AI detection or inpainting works unless implemented.
5. Use modular, reusable components.
6. Keep frontend and backend code organized.
7. Write clear setup and execution instructions.
8. Test every major feature before moving to the next stage.
9. Do not introduce paid APIs unless necessary.
10. Prioritize a working MVP before advanced AI features.

# 18. FINAL EXPECTED RESULT

The final product should allow a user to:

1. Open the application.
2. Create a project.
3. Upload 20–30 images.
4. Upload a replacement logo.
5. Identify and select the old logo in each image.
6. Remove the old logo and reconstruct the background.
7. Drag the replacement logo anywhere on the image.
8. Resize, rotate and adjust its transparency.
9. Apply global or individual positioning settings.
10. Preview all images.
11. Process the entire batch.
12. Download the final images individually or together as a ZIP.

The overall experience should be seamless, reliable and intuitive.

Start by inspecting the environment and creating a detailed implementation plan. Then implement the application stage by stage, testing each stage before continuing.

At the end, provide:
- Complete project structure.
- Installation instructions.
- Commands to run frontend and backend.
- Required environment variables.
- Implemented features.
- Known limitations.
- Instructions for integrating an AI inpainting provider later.

**The priority is a working, polished application with excellent custom logo positioning and reliable batch image processing.**