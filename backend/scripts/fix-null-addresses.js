const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fairpass', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Organization = require('../src/models/Organization');

async function fixNullAddresses() {
  try {
    console.log('Starting database cleanup...');
    
    // Find all organizations with null or undefined addresses
    const orgsWithNullAddress = await Organization.find({
      $or: [
        { address: null },
        { address: undefined },
        { address: { $exists: false } }
      ]
    });
    
    console.log(`Found ${orgsWithNullAddress.length} organizations with null addresses`);
    
    if (orgsWithNullAddress.length === 0) {
      console.log('No organizations with null addresses found. Database is clean!');
      return;
    }
    
    // Delete organizations with null addresses (they're invalid anyway)
    const deleteResult = await Organization.deleteMany({
      $or: [
        { address: null },
        { address: undefined },
        { address: { $exists: false } }
      ]
    });
    
    console.log(`Deleted ${deleteResult.deletedCount} organizations with null addresses`);
    
    // Verify the cleanup
    const remainingOrgsWithNullAddress = await Organization.find({
      $or: [
        { address: null },
        { address: undefined },
        { address: { $exists: false } }
      ]
    });
    
    if (remainingOrgsWithNullAddress.length === 0) {
      console.log('✅ Successfully cleaned up all organizations with null addresses');
    } else {
      console.log(`⚠️  Warning: ${remainingOrgsWithNullAddress.length} organizations still have null addresses`);
    }
    
    // Check for duplicate addresses
    const duplicateAddresses = await Organization.aggregate([
      {
        $group: {
          _id: "$address",
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    if (duplicateAddresses.length > 0) {
      console.log(`⚠️  Warning: Found ${duplicateAddresses.length} duplicate addresses:`);
      duplicateAddresses.forEach(dup => {
        console.log(`   Address: ${dup._id}, Count: ${dup.count}`);
      });
    } else {
      console.log('✅ No duplicate addresses found');
    }
    
  } catch (error) {
    console.error('Error during database cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the cleanup
fixNullAddresses();
