const mongoose = require('mongoose');

const toteFormSchema = new mongoose.Schema({
  boxCondition: {
    type: String,
    required: true,
    enum: ['Box Dikirim', 'Box Kembali']
  },
  namaCustomer: {
    type: String,
    required: true
  },
  tanggalPengiriman: {
    type: Date
  },
  codeBox: {
    type: String,
    required: true
  },
  nomorDO: {
    type: String,
    required: function() {
      return this.boxCondition === 'Box Kembali';
    }
  },
  areaPengiriman: {
    type: String
  },
  jenisKendaraan: {
    type: String
  },
  tanggalBoxKembali: {
    type: Date
  },
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  userBranch: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ToteForm', toteFormSchema); 