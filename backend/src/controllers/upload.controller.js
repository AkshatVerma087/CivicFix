const { uploadFile } = require('../services/storage.service');


async function createPost(req,res){
    try{
        const file = req.file;

        const result = await uploadFile(
            file.path,
            "civic-sense-posts",
            file.mimetype.startsWith('image/') ? 'image' : 'video'
        );

        FileSystem.unlinkSync(file.path);

        res.json({
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'Failed to upload file' });
    }
}

module.exports = { createPost };