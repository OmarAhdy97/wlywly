import React, { useState, useMemo } from 'react';
import formulasCatalog from '../data/legal_formulas.json';
import { VALID_CATEGORIES } from '../lib/formulaValidator';
import { generateDocumentContent } from '../lib/formulaEngine';
import { getUserFavorites, toggleUserFavorite, getSavedDocuments, deleteDocument } from '../lib/documentStorage';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

import FormulaCategoryView from '../components/formulas/FormulaCategoryView';
import FormulaList from '../components/formulas/FormulaList';
import DynamicFormulaForm from '../components/formulas/DynamicFormulaForm';
import FormulaPreview from '../components/formulas/FormulaPreview';
import LegalDocumentEditor from '../components/formulas/LegalDocumentEditor';
import SavedDocumentsModal from '../components/formulas/SavedDocumentsModal';

export default function LegalFormulasPage() {
  const { user } = useAuth();
  const { officeProfile, cases, clients } = useData();

  // Navigation Views: 'CATEGORIES' | 'CATEGORY_FORMULAS' | 'FORM' | 'PREVIEW' | 'EDITOR' | 'SEARCH_RESULTS' | 'FAVORITES'
  const [currentView, setCurrentView] = useState('CATEGORIES');

  // Selected State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [activeFormValues, setActiveFormValues] = useState({});
  const [generatedContent, setGeneratedContent] = useState('');
  const [activeContextData, setActiveContextData] = useState({});

  // Global Search Term
  const [globalSearch, setGlobalSearch] = useState('');

  // Favorites
  const [favorites, setFavorites] = useState(() => getUserFavorites(user?.id));

  // Saved Documents Modal
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [savedDocs, setSavedDocs] = useState([]);

  const handleRefreshSavedDocs = async () => {
    try {
      const docs = await getSavedDocuments(user?.id);
      setSavedDocs(docs || []);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    handleRefreshSavedDocs();
  }, [user?.id]);

  // Actual counts per category
  const categoryCounts = useMemo(() => {
    const counts = {};
    VALID_CATEGORIES.forEach(c => counts[c] = 0);
    formulasCatalog.forEach(f => {
      if (counts[f.category] !== undefined) {
        counts[f.category]++;
      }
    });
    return counts;
  }, []);

  const handleToggleFavorite = (formulaId) => {
    const updated = toggleUserFavorite(formulaId, user?.id);
    setFavorites(updated);
  };

  const handleDeleteSavedDoc = async (docId) => {
    await deleteDocument(docId, user?.id);
    await handleRefreshSavedDocs();
  };

  // Nav Handlers
  const handleOpenCategory = (cat) => {
    setSelectedCategory(cat);
    setCurrentView('CATEGORY_FORMULAS');
  };

  const handleSelectFormula = (formula) => {
    setSelectedFormula(formula);
    setActiveFormValues({});
    setCurrentView('FORM');
  };

  const handleGenerateDocument = (values, contextData) => {
    setActiveFormValues(values);
    setActiveContextData(contextData);

    const chosenCase = cases.find(c => c.id === contextData.selectedCaseId);
    const chosenClient = clients.find(c => c.id === contextData.selectedClientId);

    const result = generateDocumentContent(selectedFormula, values, {
      selectedCase: chosenCase,
      selectedClient: chosenClient,
      officeProfile
    });

    if (result.errors.length > 0) {
      alert(result.errors.join('\n'));
      return;
    }

    setGeneratedContent(result.content);
    setCurrentView('EDITOR');
  };

  const handlePreviewDocument = (values, contextData) => {
    setActiveFormValues(values);
    setActiveContextData(contextData);

    const chosenCase = cases.find(c => c.id === contextData.selectedCaseId);
    const chosenClient = clients.find(c => c.id === contextData.selectedClientId);

    const result = generateDocumentContent(selectedFormula, values, {
      selectedCase: chosenCase,
      selectedClient: chosenClient,
      officeProfile
    });

    if (result.errors.length > 0) {
      alert(result.errors.join('\n'));
      return;
    }

    setGeneratedContent(result.content);
    setCurrentView('PREVIEW');
  };

  const handleResumeSavedDoc = (doc) => {
    const formula = formulasCatalog.find(f => f.id === doc.formulaId) || {
      id: doc.formulaId || 'custom_doc',
      title: doc.title,
      category: doc.category || 'مستندات',
      fields: []
    };

    setSelectedFormula(formula);
    setActiveFormValues(doc.formValues || {});
    setGeneratedContent(doc.content);
    setCurrentView('EDITOR');
  };

  // Determine formulas for currently active category / search / favorites
  const activeFormulasList = useMemo(() => {
    if (currentView === 'FAVORITES') {
      return formulasCatalog.filter(f => favorites.includes(f.id));
    }
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      return formulasCatalog.filter(f =>
        f.title.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q)) ||
        (f.keywords && f.keywords.some(k => k.toLowerCase().includes(q))) ||
        (f.source_content && f.source_content.toLowerCase().includes(q))
      );
    }
    if (selectedCategory) {
      return formulasCatalog.filter(f => f.category === selectedCategory);
    }
    return [];
  }, [currentView, selectedCategory, globalSearch, favorites]);

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* 1. Main 10 Categories View (when no global search is active) */}
      {currentView === 'CATEGORIES' && !globalSearch.trim() && (
        <FormulaCategoryView
          categories={VALID_CATEGORIES}
          categoryCounts={categoryCounts}
          onSelectCategory={handleOpenCategory}
          searchTerm={globalSearch}
          setSearchTerm={setGlobalSearch}
          onOpenSavedDocs={() => {
            handleRefreshSavedDocs();
            setIsSavedModalOpen(true);
          }}
          savedDocsCount={savedDocs.length}
          favoritesCount={favorites.length}
          onShowFavorites={() => setCurrentView('FAVORITES')}
        />
      )}

      {/* 2. Global Search Results View */}
      {currentView === 'CATEGORIES' && globalSearch.trim().length > 0 && (
        <FormulaList
          categoryTitle={`نتائج البحث عن: "${globalSearch}"`}
          formulas={activeFormulasList}
          onSelectFormula={handleSelectFormula}
          onBack={() => setGlobalSearch('')}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          isGlobalSearch={true}
        />
      )}

      {/* 3. Category Formulas View */}
      {currentView === 'CATEGORY_FORMULAS' && (
        <FormulaList
          categoryTitle={selectedCategory}
          formulas={activeFormulasList}
          onSelectFormula={handleSelectFormula}
          onBack={() => {
            setSelectedCategory(null);
            setCurrentView('CATEGORIES');
          }}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* 4. Favorites View */}
      {currentView === 'FAVORITES' && (
        <FormulaList
          categoryTitle="الصيغ المفضلة"
          formulas={activeFormulasList}
          onSelectFormula={handleSelectFormula}
          onBack={() => setCurrentView('CATEGORIES')}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          isFavoritesView={true}
        />
      )}

      {/* 5. Dynamic Data Form View */}
      {currentView === 'FORM' && selectedFormula && (
        <DynamicFormulaForm
          formula={selectedFormula}
          initialValues={activeFormValues}
          onGenerate={handleGenerateDocument}
          onPreview={handlePreviewDocument}
          onCancel={() => {
            if (selectedCategory) {
              setCurrentView('CATEGORY_FORMULAS');
            } else {
              setCurrentView('CATEGORIES');
            }
          }}
        />
      )}

      {/* 6. Formula Preview View */}
      {currentView === 'PREVIEW' && selectedFormula && (
        <FormulaPreview
          formula={selectedFormula}
          generatedContent={generatedContent}
          formValues={activeFormValues}
          onContinueToEditor={() => setCurrentView('EDITOR')}
          onBackToForm={() => setCurrentView('FORM')}
        />
      )}

      {/* 7. Full Word-like A4 Editor View */}
      {currentView === 'EDITOR' && selectedFormula && (
        <LegalDocumentEditor
          formula={selectedFormula}
          initialContent={generatedContent}
          formValues={activeFormValues}
          contextData={activeContextData}
          onBack={() => setCurrentView('FORM')}
        />
      )}

      {/* Saved Documents Archive Modal */}
      <SavedDocumentsModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedDocs={savedDocs}
        onResumeDoc={handleResumeSavedDoc}
        onDeleteDoc={handleDeleteSavedDoc}
      />
    </div>
  );
}
