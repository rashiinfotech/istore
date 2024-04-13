const catModel = require('../../model/categoryModel');

const catList = async (req, res) => {
    try {
        if (req.session.user && req.session.user.isAdmin) {
            const categories = await catModel.find();
            const { success, message } = req.query;

            res.render('admin/cat-list', { user: req.session.user, categories: categories,success, message });
        } else {
            res.render('admin/adminLogin');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
};

const addCat = (req, res) => {
    const success = req.query.success || false;
    const message = req.query.message || '';
    const error = req.query.error || false;

    if (req.session.user && req.session.user.isAdmin) {
        res.render('admin/add-cat', { user: req.session.user, success, message, error });
    } else {
        res.render('admin/adminLogin');
    }
};

const submitCat = (req, res) => {
    const { name, description, discount } = req.body;

    catModel.findOne({ name: name })
        .then((existingCategory) => {
            if (existingCategory) {
                res.redirect(`/admin/add-cat?error=true&message=Category already exists`);
            } else {
                const newCategory = new catModel({
                    name: name,
                    description: description,
                    discount: discount
                });

                newCategory.save()
                    .then(() => {
                        res.redirect(`/admin/add-cat?success=true&message=Category added successfully`);
                    })
                    .catch((error) => {
                        console.error(error);
                        res.redirect(`/admin/add-cat?error=true&message=Error: Unable to add category to the database.`);
                    });
            }
        })
        .catch((error) => {
            console.error(error);
            res.redirect(`/admin/add-cat?error=true&message=Error: Unable to check existing categories.`);
        });
};

const blockCat = async (req, res) => {
    const categoryId = req.params.categoryId;

    try {
        await catModel.updateOne(
            { _id: categoryId },
            { $set: { status: false } }
        );
        res.redirect("/admin/cat-list");
    } catch (error) {
        console.error("Error blocking category:", error);
        res.status(500).send("Internal Server Error");
    }
};

const unblockCat = async (req, res) => {
    const categoryId = req.params.categoryId;

    try {
        await catModel.updateOne(
            { _id: categoryId },
            { $set: { status: true } }
        );
        res.redirect("/admin/cat-list");
    } catch (error) {
        console.error("Error unblocking category:", error);
        res.status(500).send("Internal Server Error");
    }
};

const editCat = async(req, res) => {
  const categoryId = req.params.categoryId;
  const success = req.query.success || false;
  const message = req.query.message || '';
  const error = req.query.error || false;
 
  const category = await catModel.findById(categoryId); // Find the category by ID
  if (req.session.user && req.session.user.isAdmin) {
      res.render('admin/edit-cat', { user: req.session.user, category: category  , success, message, error });
  } else {
      res.render('admin/adminLogin');
  }
};

const deleteCat = async (req, res) => {
  const categoryId = req.params.categoryId;
  try {
      await catModel.deleteOne({ _id: categoryId });
      res.redirect("/admin/cat-list?success=true&message=Category deleted successfully");
  } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).send("Internal Server Error");
  }
};const updateCat = async (req, res) => {
    const categoryId = req.params.categoryId;
    const { name, description, discount } = req.body;

    try {
        // Check if the category with the new name already exists
        const existingCategory = await catModel.findOne({ name: name });

        console.log("Existing Category:", existingCategory);
        console.log("Existing Category ID:", existingCategory ? existingCategory._id.toString() : "Not found");
        console.log("Requested Category ID:", categoryId);

        if (existingCategory && existingCategory._id.toString() !== categoryId) {
            console.log("Category with same name already exists.");
            // If a category with the same name already exists (excluding the current category being updated), redirect with an error message
            return res.redirect(`/admin/edit-cat/${categoryId}?error=true&message=Category with this name already exists`);
        }

        // Find the category by ID and update its details
        const updatedCategory = await catModel.findByIdAndUpdate(categoryId, {
            name: name,
            description: description,
            discount: discount
        }, { new: true });

        if (!updatedCategory) {
            console.log("Category not found.");
            return res.status(404).send("Category not found");
        }

        // Redirect with success message
        console.log("Category updated successfully.");
        res.redirect("/admin/cat-list?success=true&message=Category updated successfully");
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).send("Internal Server Error");
    }
};



module.exports = { catList, addCat, submitCat, blockCat, editCat, deleteCat ,unblockCat,updateCat};
