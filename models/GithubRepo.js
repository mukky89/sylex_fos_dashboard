const mongoose = require('mongoose');
// GitHub projekty a odkazy — evidencia repozitárov tímu
const githubRepoSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },   // názov projektu
  repoUrl:     { type: String, default: '', trim: true },      // https://github.com/org/repo
  description: { type: String, default: '' },
  language:    { type: String, default: '', trim: true },      // hlavný jazyk (JS, Python, ...)
  status:      { type: String, enum: ['active', 'archived', 'planned'], default: 'active' },
  private:     { type: Boolean, default: false },
  tags:        [String],
  links:       [{ label: String, url: String }],               // ďalšie odkazy (dokumentácia, wiki, releases...)
  owner:       { type: String, default: '' },                  // zodpovedná osoba
  order:       { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('GithubRepo', githubRepoSchema);
