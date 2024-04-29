const { body, validationResult } = require('express-validator')

// middleware/authMiddleware.js

// const  = (req, res, next) => {
//     if (req.isAuthenticated()) {
//       return next();
//     }
//     res.redirect('/login');
//   };
const isAuthenticated = (req, res, next) => {
    console.log("wait user check is auth");
    // Check if user is authenticated (you need to implement this logic based on your authentication mechanism)
    const isAuthenticated = req.session.isAuth || false; // Assuming req.session.isAuth is set after successful authentication
    
    // Store the authentication status in the request object
    req.isAuthenticated = isAuthenticated;
    req.userDetails = req.session.user; // Assuming user details are stored in req.session.user
    console.log("user signed and passed middleware: ", req.userDetails);
    
    next();
};
// Validation middleware
// validationMiddleware.js

const validateSignupoDefine = [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Invalid phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const validateSignup = (req, res, next) => {
    // Execute the validation rules
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // If validation succeeds, move to the next middleware/route handler
    next();
};




  module.exports = {isAuthenticated,validateSignup,validateSignupoDefine };
  
  // <!-- address secion -->
  // <div class="profile-box p-4 mb-4">
  //   <h2 class="mb-4">Address</h2>
  //   <div class="profile-address mb-4">
  //     <% if (address.length > 0) { %> <% address.forEach((addr) => { %>
  //       <div class="card mb-3">
  //         <div class="card-body">
  //           <div class="row">
  //             <div class="col-md-6">
  //               <p class="card-text"><strong>Address:</strong> <%= addr.address %></p>
  //               <p class="card-text"><strong>Street:</strong> <%= addr.addressline2 %></p>
  //               <p class="card-text"><strong>City:</strong> <%= addr.city %></p>
  //             </div>
  //             <div class="col-md-6">
  //               <p class="card-text"><strong>State:</strong> <%= addr.state %></p>
  //               <p class="card-text"><strong>Pincode:</strong> <%= addr.pincode %></p>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     <% }); %> <% } else { %>
  //       <p>No address found. <a href="/add-address">Add Address</a></p>
  //     <% } %>
  //   </div>