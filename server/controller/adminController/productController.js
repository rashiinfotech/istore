const productModel = require('../../model/productModel');
const Category = require('../../model/categoryModel');
const multer = require('multer');



const submitItems = async (req, res) => {
    console.log("req.body", req.body); // Check if other form fields are being parsed correctly
    console.log("req.file", req.file);

    const { name, category, price, description, stock } = req.body; // Remove 'image' from here
    const categories = await Category.find();

    if (req.session.user && req.session.user.isAdmin) {
        if (!description) {
            req.session.errorMessage = 'Description is required';
            return res.render('admin/add-item', { user: req.session.user, successMessage: null, errorMessage: req.session.errorMessage, categories });
        }

        try {
            const existingProduct = await productModel.findOne({ name });
            if (existingProduct) {
                req.session.errorMessage = 'Product already exists';
                return res.render('admin/add-item', { user: req.session.user, successMessage: null, errorMessage: req.session.errorMessage, categories });
            }

            const newProduct = new productModel({
                name,
                category,
                price,
                description,
                stock,
                image: req.files.map(file=>file.path), // Use req.file.filename to save the filename in the database
                status: true
            });

            await newProduct.save();
            req.session.successMessage = 'Product added successfully';
            return res.render('admin/add-item', { user: req.session.user, successMessage: req.session.successMessage, errorMessage: null, categories });
        } catch (error) {
            console.error(error);
            req.session.errorMessage = 'Error: Unable to add product to the database.';
            return res.render('admin/add-item', { user: req.session.user, successMessage: null, errorMessage: req.session.errorMessage, categories });
        }
    } else {
        return res.redirect('/admin');
    }
};


const getsubmitItems = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/add-item', { user: req.session.user, successMessage: null, errorMessage: null, categories });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};



const itemsList = async (req, res) => {
    try {
        const Products = await productModel.find();
        if (req.session.user && req.session.user.isAdmin) {
            // Pass success or error messages if they exist
            const successMessage = req.session.successMessage;
            const errorMessage = req.session.errorMessage;
            // Clear the session variables after retrieving their values
            delete req.session.successMessage;
            delete req.session.errorMessage;
            res.render('admin/items-list', { user: req.session.user, Products, successMessage, errorMessage });
        } else {
            res.render('admin/adminLogin');
        }
    } catch (error) {
        // Handle any errors that might occur during database query
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};




const itemEditor = async (req, res) => {
    
    const { productId } = req.params;
    try {
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Fetch category name
        const category = await Category.findById(product.category);
        const categoryName = category ? category.name : '';

        const successMessage = req.query.successMessage || '';
        const errorMessage = req.query.errorMessage || '';
        const categories = await Category.find();
        
        if (req.session.user && req.session.user.isAdmin) {
            res.render("admin/item-editor", { user: req.session.user, product, categoryName, successMessage, errorMessage ,categories});
        } else {
            res.render('admin/adminLogin');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};



const updateProduct = async (req, res) => {
    console.log("Requested update with:", req.body);
    const { productId } = req.params;
    const { name, category, price, description, stock } = req.body;

    if (req.session.user && req.session.user.isAdmin) {
        // Example validation: Check if name, category, and price are provided
        if (!name || !category || !price) {
            req.session.errorMessage = 'Name, category, and price are required';
            return res.redirect(`/admin/item-editor/${productId}?errorMessage=Name, category, and price are required`);
        }

        try {
            const product = await productModel.findById(productId);
            if (!product) {
                return res.status(404).send('Product not found');
            }

            // Update product details
            product.name = name;
            product.category = category;
            product.price = price;
            product.description = description;
            product.stock = stock;

            // Check if files are uploaded
            if (req.files && req.files.length > 0) {
                // Update product images
                const newImages = req.files.map(file => file.path);
                product.image = [...product.image, ...newImages];
            }

            // Check for deleted images
            if (req.body.deletedImages) {
                const deletedImages = JSON.parse(req.body.deletedImages);
                deletedImages.forEach(deletedImage => {
                    // Remove deleted image from the array
                    const index = product.image.indexOf(deletedImage.path);
                    if (index !== -1) {
                        product.image.splice(index, 1);
                    }
                });
            }

            await product.save();

            req.session.successMessage = 'Product updated successfully';
            return res.redirect(`/admin/items-list`);
        } catch (error) {
            console.error(error);
            req.session.errorMessage = 'Error updating product';
            return res.redirect(`/admin/item-editor/${productId}?errorMessage=Error updating product`);
        }
    } else {
        return res.status(403).send('Unauthorized');
    }
};




const deleteProduct = async (req, res) => {
    if (req.session.user && req.session.user.isAdmin) {
        const productId = req.params.productId;

        try {
            const result = await productModel.updateOne(
                { _id: productId },
                { $set: { status: false } }
            );

            if (result.modifiedCount === 1) {
                console.log(`Product with ID ${productId} soft deleted successfully`);
                req.session.successMessage = 'Product soft deleted successfully';
            } else {
                console.log(`Product with ID ${productId} not found`);
                req.session.errorMessage = 'Product not found';
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            req.session.errorMessage = 'Internal Server Error';
        }

        res.redirect("/admin/items-list");
    } else {
        res.status(403).send("Forbidden");
    }
};

const activateProduct = async (req, res) => {
    if (req.session.user && req.session.user.isAdmin) {
        const productId = req.params.productId;

        try {
            const result = await productModel.updateOne(
                { _id: productId },
                { $set: { status: true } }
            );

            if (result.modifiedCount === 1) {
                console.log(`Product with ID ${productId} activated successfully`);
                req.session.successMessage = 'Product activated successfully';
            } else {
                console.log(`Product with ID ${productId} not found`);
                req.session.errorMessage = 'Product not found';
            }
        } catch (error) {
            console.error("Error activating product:", error);
            req.session.errorMessage = 'Internal Server Error';
        }

        res.redirect("/admin/items-list");
    } else {
        res.status(403).send("Forbidden");
    }
};





module.exports = { submitItems, getsubmitItems,itemsList ,itemEditor,updateProduct,deleteProduct,activateProduct};
