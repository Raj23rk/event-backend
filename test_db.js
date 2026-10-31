const mongoose = require('mongoose');
const uri = 'mongodb+srv://Raj:iT3Wqx0axmZv1dHI@cluster0.86ttxfk.mongodb.net/wegrowskillcampus?appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas!');
  
  const students = await mongoose.connection.db.collection('students').find({}).toArray();
  console.log('Students count:', students.length);
  for (const s of students) {
    console.log(s._id, s.registrationNumber, s.email, s.mobile);
  }
  
  const indexes = await mongoose.connection.db.collection('students').indexes();
  console.log('Indexes:', JSON.stringify(indexes, null, 2));
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
