const productModel = require('../../model/productModel');
const Category = require('../../model/categoryModel');
const multer = require('multer');







 // // Check if file is a .jpg or .jpeg file
        // if (!lowercaseFilename.endsWith('.jpg') && !lowercaseFilename.endsWith('.jpeg')) {
        //     req.session.errorMessage = 'Only jpg or jpeg files are supported';
        //     return res.render('admin/add-item', { 
        //         categories, 
        //         successMessage: null, 
        //         user: req.session.user, 
        //         errorMessage: req.session.errorMessage, 
        //         typedFields: req.session.typedFields 
        //     });
        // }

const submitItems = async (req, res) => {
            console.log("req.body", req.body); // Check if other form fields are being parsed correctly
            console.log("req.files", req.files);
        
            const { name, category, price, description, stock } = req.body; // Remove 'image' from here
            const categories = await Category.find();
            req.session.typedFields = { name, category, price, description, stock };
        
            if (req.session.user && req.session.user.isAdmin) {
                if (!name || !category || !price || isNaN(price) || !description || !stock || isNaN(stock)) {
                    req.session.errorMessage = 'All fields are required and must be valid';
                    return res.render('admin/add-item', {
                        categories,
                        successMessage: null,
                        user: req.session.user,
                        errorMessage: req.session.errorMessage,
                        typedFields: req.session.typedFields
                    });
                }
        
                try {
                    // Validate uploaded files
                    if (!req.files || req.files.length === 0) {
                        req.session.errorMessage = 'At least one image is required';
                        return res.render('admin/add-item', {
                            categories,
                            successMessage: null,
                            user: req.session.user,
                            errorMessage: req.session.errorMessage,
                            typedFields: req.session.typedFields
                        });
                    }
        
                    const validFiles = req.files.filter(file => file.mimetype.startsWith('image/') && file.size <= (5 * 1024 * 1024)); // 5MB file size limit
        
                    if (validFiles.length !== req.files.length) {
                        req.session.errorMessage = 'Some files are not images or exceed the size limit (5MB)';
                        return res.render('admin/add-item', {
                            categories,
                            successMessage: null,
                            user: req.session.user,
                            errorMessage: req.session.errorMessage,
                            typedFields: req.session.typedFields
                        });
                    }
        
                    // Proceed with saving the product data and image paths to the database
                    const existingProduct = await productModel.findOne({ name });
                    if (existingProduct) {
                        req.session.errorMessage = 'Product already exists';
                        return res.render('admin/add-item', {
                            user: req.session.user,
                            successMessage: null,
                            errorMessage: req.session.errorMessage,
                            categories,
                            typedFields: req.session.typedFields
                        });
                    }
        
                    const newProduct = new productModel({
                        name,
                        category,
                        price,
                        description,
                        stock,
                        image: validFiles.map(file => file.path), // Use valid files for saving image paths
                        status: true
                    });
        
                    await newProduct.save();
                    const Products = await productModel.find();
                    req.session.successMessage = 'Product added successfully';
                    return res.render('admin/items-list', {
                        user: req.session.user,
                        Products,
                        successMessage: req.session.successMessage,
                        errorMessage: null,
                        categories,
                        typedFields: req.session.typedFields
                    });
                } catch (error) {
                    console.error(error);
                    req.session.errorMessage = 'Error: Unable to add product to the database.';
                    return res.render('admin/add-item', {
                        user: req.session.user,
                        successMessage: null,
                        errorMessage: req.session.errorMessage,
                        categories,
                        typedFields: req.session.typedFields
                    });
                }
            } else {
                return res.redirect('/admin');
            }
        };
        

const getsubmitItems = async (req, res) => {
    try {
        const categories= await Category.find();
        // Define typedFields with the appropriate values
        
        res.render('admin/add-item', { user: req.session.user, successMessage: null, errorMessage: null, categories, typedFields: req.session.typedFields });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

// const updateProduct = async (req, res) => {
//     try {
//         const productId = req.params.productId;
//         // Retrieve updated product data from the request body
//         const updatedProductData = req.body;

//         // Update the product in the database
//         const updatedProduct = await Product.findByIdAndUpdate(productId, updatedProductData, { new: true });

//         // Send the updated product as a response
//         res.status(200).json(updatedProduct);
//     } catch (error) {
//         console.error('Error updating product:', error);
//         res.status(500).send('Internal Server Error');
//     }
// };





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



const updateProduct= async (req, res) => {
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

// Assuming you have already imported necessary modules and set up your Express app

// Define a route for handling GET requests to /product-img-editor
const productImgEditor = async (req, res) => {
    try {
        // Retrieve the product ID from the request parameters
        const productId = req.query.productId;

        // Log the product ID to ensure it's being received correctly
        console.log('Product ID:', productId);

        // Fetch the selected product using the product ID
        const product = await productModel.findById(productId);

        if (!product) {
            // If the product is not found, return a 404 error
            return res.status(404).send('Product not found');
        }

        // Initialize imageNotFound as an empty array
        let imageNotFound = [];

        // Check if the user is an admin
        if (req.session.user && req.session.user.isAdmin) {
            // Pass success or error messages if they exist
            const successMessage = req.session.successMessage;
            const errorMessage = req.session.errorMessage;
            // Clear the session variables after retrieving their values
            delete req.session.successMessage;
            delete req.session.errorMessage;
            // Render the product-img-editor page with the selected product and imageNotFound
            res.render('admin/product-img-editor', { user: req.session.user, product, successMessage, errorMessage, imageNotFound });
        } else {
            // If the user is not an admin, redirect to the admin login page
            res.render('admin/adminLogin');
        }
    } catch (error) {
        // Handle any errors that might occur during database query
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const updateImage = async (req, res) => {
    try {
        const productId = req.params.productId;
        // Retrieve updated product data from the request body
        const updatedProductData = req.body;

        // Update the product in the database
        const updatedProduct = await Product.findByIdAndUpdate(productId, updatedProductData, { new: true });

        // Send the updated product as a response
        res.status(200).json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Implement the route handler function
const deleteImage = async (req, res) => {
    try {
        console.log("reached");
        const productId = req.params.productId;
        const imageIndex = parseInt(req.params.imageIndex); // Parse imageIndex as integer

        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Check if the imageIndex is valid
        if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= product.image.length) {
            return res.status(400).send('Invalid image index');
        }

        // Remove the image from the product's image array
        product.image.splice(imageIndex, 1);

        // Save the updated product
        await product.save();

        res.status(200).send('Image deleted successfully');
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).send('Internal Server Error');
    }
};






module.exports = { submitItems, getsubmitItems,itemsList ,itemEditor,updateProduct,
    deleteProduct,activateProduct,deleteImage,updateImage,productImgEditor,};
