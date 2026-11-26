const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    // String (not Number) so values like "00123" keep their leading zeros.
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      maxlength: [30, 'Roll number must be at most 30 characters'],
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
      maxlength: [100, 'Branch must be at most 100 characters'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [300, 'Address must be at most 300 characters'],
    },
  },
  { timestamps: true }
);

studentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Student', studentSchema);
